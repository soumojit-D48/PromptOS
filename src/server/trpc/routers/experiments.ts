import { z } from "zod";
import { router, protectedProc, orgProc, editorProc } from "../init";
import { experiments, experimentRuns, prompts, promptVersions, organizations, orgMembers } from "@/server/db/schema";
import { eq, and, desc, sql, count, gte, sql as sqlFn } from "drizzle-orm";
import { inngest } from "@/server/inngest/client";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export const experimentsRouter = router({
  list: protectedProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.promptId
        ? and(eq(experiments.promptId, input.promptId as string))
        : undefined;
      
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });

      return ctx.db.query.experiments.findMany({
        where,
        orderBy: [desc(experiments.createdAt)],
        with: {
          prompt: true,
        },
      });
    }),

  get: protectedProc
    .input(z.object({ orgId: z.string().uuid(), experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const experiment = await ctx.db.query.experiments.findFirst({
        where: eq(experiments.id, input.experimentId),
        with: {
          prompt: true,
        },
      });
      
      if (!experiment) return null;
      
      const runs = await ctx.db.query.experimentRuns.findMany({
        where: eq(experimentRuns.experimentId, input.experimentId),
      });
      
      const totalRuns = runs.length;
      const completedRuns = runs.filter(r => r.output !== null).length;
      
      return {
        ...experiment,
        totalRuns,
        completedRuns,
        runs,
      };
    }),

  create: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      promptId: z.string().uuid(),
      name: z.string().min(1).max(100),
      trafficSplit: z.record(z.string(), z.number().min(0).max(100)),
      inputs: z.array(z.record(z.string(), z.string())).min(5).max(100),
      scoringRubric: z.string().optional(),
      enableScoring: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role === "viewer") throw new TRPCError({ code: "FORBIDDEN", message: "Editor or Owner role required" });

      const splitValues = Object.values(input.trafficSplit);
      const splitSum = splitValues.reduce((a, b) => a + b, 0);
      
      if (splitSum !== 100) {
        throw new Error("Traffic split must sum to 100%");
      }
      
      const versions = await ctx.db.query.promptVersions.findMany({
        where: and(
          eq(promptVersions.promptId, input.promptId),
          eq(promptVersions.isPublished, true)
        ),
        orderBy: [desc(promptVersions.createdAt)],
      });
      
      if (versions.length < 2) {
        throw new Error("At least 2 published versions required");
      }
      
      const versionIds = versions.map(v => v.id);
      const inputVersionIds = Object.keys(input.trafficSplit);
      
const invalidVersions = inputVersionIds.filter(id => !versionIds.includes(id));
      if (invalidVersions.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid version IDs in traffic split",
        });
      }

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.orgId),
      });

      if (org?.plan === "free") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const recentExperiments = await ctx.db
          .select({ count: sqlFn<number>`count(*)` })
          .from(experiments)
          .where(
            and(
              eq(experiments.promptId, input.promptId),
              gte(experiments.createdAt, oneMonthAgo)
            )
          );

        if (recentExperiments[0]?.count >= 5) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free plan allows 5 experiments per month. Upgrade to Pro for more.",
          });
        }
      }

      const [experiment] = await ctx.db.insert(experiments).values({
        promptId: input.promptId,
        name: input.name,
        trafficSplit: input.trafficSplit,
      }).returning();
      
      return experiment;
    }),

  start: protectedProc
    .input(z.object({ orgId: z.string().uuid(), experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [experiment] = await ctx.db
        .update(experiments)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(experiments.id, input.experimentId))
        .returning();
      
      await inngest.send({
        name: "experiment/started",
        data: { experimentId: input.experimentId },
      });
      
      return experiment;
    }),

  results: protectedProc
    .input(z.object({ orgId: z.string().uuid(), experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const experiment = await ctx.db.query.experiments.findFirst({
        where: eq(experiments.id, input.experimentId),
      });
      
      if (!experiment) return null;
      
      const runs = await ctx.db.query.experimentRuns.findMany({
        where: eq(experimentRuns.experimentId, input.experimentId),
      });
      
      const trafficSplit = experiment.trafficSplit as Record<string, number>;
      const versionIds = Object.keys(trafficSplit);
      
      const results = await Promise.all(
        versionIds.map(async (versionId) => {
          const versionRuns = runs.filter(r => r.versionId === versionId && r.output !== null);
          
          if (versionRuns.length === 0) {
            return {
              versionId,
              runCount: 0,
              avgLatency: 0,
              p50Latency: 0,
              p95Latency: 0,
              avgTokensIn: 0,
              avgTokensOut: 0,
              avgScore: null,
            };
          }
          
          const latencies = versionRuns.map(r => r.latencyMs ?? 0).filter(l => l > 0).sort((a, b) => a - b);
          const tokensIn = versionRuns.map(r => r.tokensIn ?? 0).filter(t => t > 0);
          const tokensOut = versionRuns.map(r => r.tokensOut ?? 0).filter(t => t > 0);
          const scores = versionRuns.map(r => r.score).filter(s => s !== null) as number[];
          
          const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          
          const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
          const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
          
          return {
            versionId,
            runCount: versionRuns.length,
            avgLatency: Math.round(avg(latencies)),
            p50Latency: p50,
            p95Latency: p95,
            avgTokensIn: Math.round(avg(tokensIn)),
            avgTokensOut: Math.round(avg(tokensOut)),
            avgScore: scores.length > 0 ? Math.round(avg(scores) * 10) / 10 : null,
          };
        })
      );
      
      return results;
    }),

  declare: protectedProc
    .input(z.object({ orgId: z.string().uuid(), experimentId: z.string().uuid(), versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.query.experiments.findFirst({
        where: eq(experiments.id, input.experimentId),
      });
      
      if (!experiment) {
        throw new Error("Experiment not found");
      }
      
      await ctx.db
        .update(promptVersions)
        .set({ isPublished: false })
        .where(eq(promptVersions.promptId, experiment.promptId));
      
      await ctx.db
        .update(promptVersions)
        .set({ isPublished: true })
        .where(eq(promptVersions.id, input.versionId));
      
      await ctx.db
        .update(prompts)
        .set({ updatedAt: new Date() })
        .where(eq(prompts.id, experiment.promptId));
      
      const [updated] = await ctx.db
        .update(experiments)
        .set({ 
          status: "done", 
          winnerVersion: input.versionId,
          endedAt: new Date(),
        })
        .where(eq(experiments.id, input.experimentId))
        .returning();
      
      return updated;
    }),
});
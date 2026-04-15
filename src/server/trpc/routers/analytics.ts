import { z } from "zod";
import { router, protectedProc, orgProc } from "../init";
import { db } from "@/server/db";
import { experimentRuns, promptVersions, prompts, experiments } from "@/server/db/schema";
import { eq, and, gte, lte, desc, sql, avg, count, sum } from "drizzle-orm";

const timeWindowSchema = z.enum(["7d", "30d", "90d"]);

function getDateRange(window: string) {
  const now = new Date();
  const days = window === "7d" ? 7 : window === "30d" ? 30 : 90;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end: now };
}

function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function estimateCost(tokensIn: number, tokensOut: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0 },
    "google/gemma-3-27b-it:free": { input: 0, output: 0 },
    "mistralai/mistral-7b-instruct:free": { input: 0, output: 0 },
    "qwen/qwen-2.5-72b-instruct:free": { input: 0, output: 0 },
    "deepseek/deepseek-r1:free": { input: 0, output: 0 },
  };
  const rates = pricing[model] || { input: 0.15, output: 0.15 };
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

export const analyticsRouter = router({
  summary: protectedProc
    .input(z.object({
      orgId: z.string(),
      promptId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { orgId, promptId } = input;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const promptFilter = promptId
        ? sql`${promptVersions.promptId} = ${promptId}`
        : sql`EXISTS (SELECT 1 FROM ${prompts} WHERE ${prompts.id} = ${promptVersions.promptId} AND ${prompts.orgId} = ${orgId})`;

      const runs = await db
        .select({
          latencyMs: experimentRuns.latencyMs,
          tokensIn: experimentRuns.tokensIn,
          tokensOut: experimentRuns.tokensOut,
          runType: experimentRuns.runType,
        })
        .from(experimentRuns)
        .innerJoin(promptVersions, eq(experimentRuns.versionId, promptVersions.id))
        .where(
          and(
            gte(experimentRuns.createdAt, thirtyDaysAgo),
            promptFilter as any
          )
        );

      if (runs.length === 0) {
        return {
          totalRuns: 0,
          avgLatency: 0,
          p50Latency: 0,
          p95Latency: 0,
          totalTokensIn: 0,
          totalTokensOut: 0,
          estimatedCost: 0,
          runsPerDay: [],
        };
      }

      const latencies = runs.map((r) => r.latencyMs).filter(Boolean) as number[];
      const tokensIn = runs.reduce((sum, r) => sum + (r.tokensIn || 0), 0);
      const tokensOut = runs.reduce((sum, r) => sum + (r.tokensOut || 0), 0);

      const dailyMap = new Map<string, { runs: number; tokensIn: number; tokensOut: number }>();
      runs.forEach((r) => {
        if (!r.latencyMs) return;
        const date = new Date(r.latencyMs).toISOString().split("T")[0];
        const existing = dailyMap.get(date) || { runs: 0, tokensIn: 0, tokensOut: 0 };
        dailyMap.set(date, {
          runs: existing.runs + 1,
          tokensIn: existing.tokensIn + (r.tokensIn || 0),
          tokensOut: existing.tokensOut + (r.tokensOut || 0),
        });
      });

      const runsPerDay = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalRuns: runs.length,
        avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        p50Latency: calculatePercentile(latencies, 50),
        p95Latency: calculatePercentile(latencies, 95),
        totalTokensIn: tokensIn,
        totalTokensOut: tokensOut,
        estimatedCost: estimateCost(tokensIn, tokensOut, "meta-llama/llama-3.3-70b-instruct:free"),
        runsPerDay,
      };
    }),

  timeline: protectedProc
    .input(z.object({
      orgId: z.string(),
      window: timeWindowSchema,
    }))
    .query(async ({ input }) => {
      const { orgId, window } = input;
      const { start } = getDateRange(window);

      const data = await db
        .select({
          date: sql<Date>`DATE(${experimentRuns.createdAt})`.as("date"),
          count: count(),
          tokensIn: sum(experimentRuns.tokensIn),
          tokensOut: sum(experimentRuns.tokensOut),
          latencyMs: avg(experimentRuns.latencyMs),
        })
        .from(experimentRuns)
        .innerJoin(promptVersions, eq(experimentRuns.versionId, promptVersions.id))
        .innerJoin(prompts, eq(promptVersions.promptId, prompts.id))
        .where(
          and(
            eq(prompts.orgId, orgId),
            gte(experimentRuns.createdAt, start)
          )
        )
        .groupBy(sql`DATE(${experimentRuns.createdAt})`)
        .orderBy(sql`DATE(${experimentRuns.createdAt})`);

      return data.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        runs: Number(d.count) || 0,
        tokensIn: Number(d.tokensIn) || 0,
        tokensOut: Number(d.tokensOut) || 0,
        avgLatency: Math.round(Number(d.latencyMs) || 0),
      }));
    }),

  orgSummary: protectedProc
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      const { orgId } = input;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const runs = await db
        .select({
          latencyMs: experimentRuns.latencyMs,
          tokensIn: experimentRuns.tokensIn,
          tokensOut: experimentRuns.tokensOut,
        })
        .from(experimentRuns)
        .innerJoin(promptVersions, eq(experimentRuns.versionId, promptVersions.id))
        .innerJoin(prompts, eq(promptVersions.promptId, prompts.id))
        .where(and(eq(prompts.orgId, orgId), gte(experimentRuns.createdAt, thirtyDaysAgo)));

      const topPrompts = await db
        .select({
          promptId: promptVersions.promptId,
          promptName: prompts.name,
          count: count(),
        })
        .from(experimentRuns)
        .innerJoin(promptVersions, eq(experimentRuns.versionId, promptVersions.id))
        .innerJoin(prompts, eq(promptVersions.promptId, prompts.id))
        .where(and(eq(prompts.orgId, orgId), gte(experimentRuns.createdAt, thirtyDaysAgo)))
        .groupBy(promptVersions.promptId, prompts.name)
        .orderBy(desc(count()))
        .limit(5);

      const latencies = runs.map((r) => r.latencyMs).filter(Boolean) as number[];
      const tokensIn = runs.reduce((sum, r) => sum + (r.tokensIn || 0), 0);
      const tokensOut = runs.reduce((sum, r) => sum + (r.tokensOut || 0), 0);

      return {
        totalRuns: runs.length,
        totalTokensIn: tokensIn,
        totalTokensOut: tokensOut,
        avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        estimatedCost: estimateCost(tokensIn, tokensOut, "meta-llama/llama-3.3-70b-instruct:free"),
        topPrompts: topPrompts.map((p) => ({
          id: p.promptId,
          name: p.promptName,
          runCount: Number(p.count),
        })),
      };
    }),

  promptSummary: protectedProc
    .input(z.object({
      orgId: z.string(),
      promptId: z.string(),
    }))
    .query(async ({ input }) => {
      const { orgId, promptId } = input;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const runs = await db
        .select({
          latencyMs: experimentRuns.latencyMs,
          tokensIn: experimentRuns.tokensIn,
          tokensOut: experimentRuns.tokensOut,
        })
        .from(experimentRuns)
        .innerJoin(promptVersions, eq(experimentRuns.versionId, promptVersions.id))
        .where(
          and(
            eq(promptVersions.promptId, promptId),
            gte(experimentRuns.createdAt, thirtyDaysAgo)
          )
        );

      const wins = await db
        .select()
        .from(experiments)
        .innerJoin(promptVersions, eq(experiments.winnerVersion, promptVersions.id))
        .where(
          and(
            eq(promptVersions.promptId, promptId),
            eq(experiments.status, "done")
          )
        );

      const latencies = runs.map((r) => r.latencyMs).filter(Boolean) as number[];
      const tokensIn = runs.reduce((sum, r) => sum + (r.tokensIn || 0), 0);
      const tokensOut = runs.reduce((sum, r) => sum + (r.tokensOut || 0), 0);

      return {
        totalRuns: runs.length,
        avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        totalTokensIn: tokensIn,
        totalTokensOut: tokensOut,
        experimentWins: wins.length,
        winRate: runs.length > 0 ? Math.round((wins.length / runs.length) * 100) : 0,
      };
    }),
});
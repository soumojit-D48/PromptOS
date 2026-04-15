import { z } from "zod";
import { router, protectedProc, orgProc, editorProc } from "../init";
import { promptVersions, prompts, orgMembers } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { inngest } from "@/server/inngest/client";
import { TRPCError } from "@trpc/server";

function computeDiff(contentA: string, contentB: string) {
  const linesA = contentA.split("\n");
  const linesB = contentB.split("\n");
  const diff: { type: "added" | "removed" | "unchanged"; line: string }[] = [];
  
  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const lineA = linesA[i];
    const lineB = linesB[i];
    
    if (lineA === undefined) {
      diff.push({ type: "added", line: lineB });
    } else if (lineB === undefined) {
      diff.push({ type: "removed", line: lineA });
    } else if (lineA === lineB) {
      diff.push({ type: "unchanged", line: lineA });
    } else {
      diff.push({ type: "removed", line: lineA });
      diff.push({ type: "added", line: lineB });
    }
  }
  return diff;
}

export const versionsRouter = router({
  list: protectedProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const prompt = await ctx.db.query.prompts.findFirst({
        where: and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)),
      });
      if (!prompt) return [];
      
      return ctx.db.query.promptVersions.findMany({
        where: eq(promptVersions.promptId, input.promptId),
        orderBy: [desc(promptVersions.versionNum)],
      });
    }),

  get: protectedProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid(), versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const prompt = await ctx.db.query.prompts.findFirst({
        where: and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)),
      });
      if (!prompt) return null;
      
      return ctx.db.query.promptVersions.findFirst({
        where: eq(promptVersions.id, input.versionId),
      });
    }),

  create: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      promptId: z.string().uuid(),
      content: z.string().min(1).max(32000),
      model: z.string(),
      params: z.object({ temperature: z.number(), maxTokens: z.number(), systemPrompt: z.string().optional() }),
      commitMsg: z.string().max(140).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role === "viewer") throw new TRPCError({ code: "FORBIDDEN", message: "Editor or Owner role required" });

      const prompt = await ctx.db.query.prompts.findFirst({
        where: and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)),
      });
      if (!prompt) throw new Error("Prompt not found");

      const latestVersion = await ctx.db.query.promptVersions.findFirst({
        where: eq(promptVersions.promptId, input.promptId),
        orderBy: [desc(promptVersions.versionNum)],
      });

      const nextVersionNum = (latestVersion?.versionNum ?? 0) + 1;

      const [version] = await ctx.db.insert(promptVersions).values({
        promptId: input.promptId,
        authorId: ctx.userId,
        versionNum: nextVersionNum,
        content: input.content,
        model: input.model,
        params: input.params,
        isPublished: false,
        commitMsg: input.commitMsg,
      }).returning();

      await ctx.db.update(prompts).set({ updatedAt: new Date() }).where(eq(prompts.id, input.promptId));

      if (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_EVENT_KEY !== "your_inngest_event_key") {
        await inngest.send({
          name: "prompt/version.created",
          data: { versionId: version.id },
        });
      }

      return version;
    }),

  publish: protectedProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid(), versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role === "viewer") throw new TRPCError({ code: "FORBIDDEN", message: "Editor or Owner role required" });
      await ctx.db
        .update(promptVersions)
        .set({ isPublished: false })
        .where(eq(promptVersions.promptId, input.promptId));

      const [version] = await ctx.db
        .update(promptVersions)
        .set({ isPublished: true })
        .where(eq(promptVersions.id, input.versionId))
        .returning();

      await ctx.db.update(prompts).set({ updatedAt: new Date() }).where(eq(prompts.id, input.promptId));

      return version;
    }),

  rollback: protectedProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid(), versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role === "viewer") throw new TRPCError({ code: "FORBIDDEN", message: "Editor or Owner role required" });

      const targetVersion = await ctx.db.query.promptVersions.findFirst({
        where: eq(promptVersions.id, input.versionId),
      });
      if (!targetVersion) throw new Error("Version not found");

      const latestVersion = await ctx.db.query.promptVersions.findFirst({
        where: eq(promptVersions.promptId, input.promptId),
        orderBy: [desc(promptVersions.versionNum)],
      });

      const nextVersionNum = (latestVersion?.versionNum ?? 0) + 1;

      const [version] = await ctx.db.insert(promptVersions).values({
        promptId: input.promptId,
        authorId: ctx.userId,
        versionNum: nextVersionNum,
        content: targetVersion.content,
        model: targetVersion.model,
        params: targetVersion.params as { temperature: number; maxTokens: number },
        isPublished: false,
        commitMsg: `Rollback to v${targetVersion.versionNum}`,
      }).returning();

      return version;
    }),

  diff: protectedProc
    .input(z.object({ orgId: z.string().uuid(), versionIdA: z.string().uuid(), versionIdB: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });

      const [versionA, versionB] = await Promise.all([
        ctx.db.query.promptVersions.findFirst({ where: eq(promptVersions.id, input.versionIdA) }),
        ctx.db.query.promptVersions.findFirst({ where: eq(promptVersions.id, input.versionIdB) }),
      ]);

      if (!versionA || !versionB) return null;

      const diff = computeDiff(versionA.content, versionB.content);
      return { versionA, versionB, diff };
    }),
});
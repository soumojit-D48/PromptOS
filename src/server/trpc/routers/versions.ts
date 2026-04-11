import { z } from "zod";
import { router, orgProc } from "../init";
import { promptVersions, prompts } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { inngest } from "@/server/inngest/client";

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
  list: orgProc
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

  get: orgProc
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

  create: orgProc
    .input(z.object({
      orgId: z.string().uuid(),
      promptId: z.string().uuid(),
      content: z.string().min(1).max(32000),
      model: z.string(),
      params: z.object({ temperature: z.number(), maxTokens: z.number(), systemPrompt: z.string().optional() }),
      commitMsg: z.string().max(140).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      await inngest.send({
        name: "prompt/version.created",
        data: { versionId: version.id },
      });

      return version;
    }),

  publish: orgProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid(), versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

  rollback: orgProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid(), versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

  diff: orgProc
    .input(z.object({ orgId: z.string().uuid(), versionIdA: z.string().uuid(), versionIdB: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [versionA, versionB] = await Promise.all([
        ctx.db.query.promptVersions.findFirst({ where: eq(promptVersions.id, input.versionIdA) }),
        ctx.db.query.promptVersions.findFirst({ where: eq(promptVersions.id, input.versionIdB) }),
      ]);

      if (!versionA || !versionB) return null;

      const diff = computeDiff(versionA.content, versionB.content);
      return { versionA, versionB, diff };
    }),
});
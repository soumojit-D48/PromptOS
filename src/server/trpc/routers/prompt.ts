import { z } from "zod";
import { router, orgProc } from "../init";
import { prompts, promptVersions } from "@/server/db/schema";
import { eq, and, or, ilike, desc, isNotNull } from "drizzle-orm";
import { embedText, cosineSimilarity } from "@/server/ai/embed";
import { db } from "@/server/db";

export const promptsRouter = router({
  list: orgProc
    .input(z.object({ orgId: z.string().uuid(), includeArchived: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.includeArchived
        ? eq(prompts.orgId, input.orgId)
        : and(eq(prompts.orgId, input.orgId), eq(prompts.isArchived, false));
      return ctx.db.query.prompts.findMany({
        where,
        orderBy: [desc(prompts.updatedAt)],
      });
    }),

  get: orgProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const prompt = await ctx.db.query.prompts.findFirst({
        where: and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)),
        with: {
          versions: {
            orderBy: [desc(promptVersions.createdAt)],
          },
        },
      });
      return prompt;
    }),

  create: orgProc
    .input(z.object({
      orgId: z.string().uuid(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [prompt] = await ctx.db.insert(prompts).values({
        orgId: input.orgId,
        createdBy: ctx.userId,
        name: input.name,
        description: input.description,
      }).returning();
      return prompt;
    }),

  update: orgProc
    .input(z.object({
      orgId: z.string().uuid(),
      promptId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [prompt] = await ctx.db
        .update(prompts)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          updatedAt: new Date(),
        })
        .where(and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)))
        .returning();
      return prompt;
    }),

  archive: orgProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [prompt] = await ctx.db
        .update(prompts)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)))
        .returning();
      return prompt;
    }),

  search: orgProc
    .input(z.object({ orgId: z.string().uuid(), query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.query.trim()) {
        return ctx.db.query.prompts.findMany({
          where: and(eq(prompts.orgId, input.orgId), eq(prompts.isArchived, false)),
          orderBy: [desc(prompts.updatedAt)],
        });
      }

      const queryEmbedding = await embedText(input.query);

      const promptData = await ctx.db.query.prompts.findMany({
        where: and(eq(prompts.orgId, input.orgId), eq(prompts.isArchived, false)),
      });

      const results = await Promise.all(
        promptData.map(async (prompt) => {
          const version = await ctx.db.query.promptVersions.findFirst({
            where: and(
              eq(promptVersions.promptId, prompt.id),
              eq(promptVersions.isPublished, true),
              isNotNull(promptVersions.embedding)
            ),
          });
          
          if (!version?.embedding) return null;

          const similarity = cosineSimilarity(
            queryEmbedding,
            version.embedding
          );

          return {
            prompt,
            similarity: similarity * 100,
            version,
          };
        })
      );

      const filteredResults = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);

      return filteredResults.map((r) => ({
        ...r.prompt,
        similarity: r.similarity,
      }));
    }),

  similar: orgProc
    .input(z.object({ orgId: z.string().uuid(), promptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const currentPrompt = await ctx.db.query.prompts.findFirst({
        where: and(eq(prompts.id, input.promptId), eq(prompts.orgId, input.orgId)),
      });
      if (!currentPrompt) return [];

      const currentVersion = await ctx.db.query.promptVersions.findFirst({
        where: and(eq(promptVersions.promptId, input.promptId), eq(promptVersions.isPublished, true)),
        orderBy: [desc(promptVersions.createdAt)],
      });

      if (!currentVersion?.embedding) return [];

      const allVersions = await ctx.db.query.promptVersions.findMany({
        where: and(
          isNotNull(promptVersions.embedding),
          eq(promptVersions.isPublished, true),
        ),
      });

      const similarResults = await Promise.all(
        allVersions
          .filter((v) => v.promptId !== input.promptId)
          .map(async (version) => {
            const similarity = cosineSimilarity(
              currentVersion.embedding!,
              version.embedding!
            );

            const prompt = await ctx.db.query.prompts.findFirst({
              where: eq(prompts.id, version.promptId),
            });

            return {
              prompt,
              similarity: similarity * 100,
              version,
            };
          })
      );

      return similarResults
        .filter((r): r is NonNullable<typeof r> => r.prompt !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
        .map((r) => ({
          ...r.prompt!,
          similarity: r.similarity,
        }));
    }),
});
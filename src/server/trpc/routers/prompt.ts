import { z } from "zod";
import { router, orgProc } from "../init";
import { prompts, promptVersions } from "@/server/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";

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
      return ctx.db.query.prompts.findMany({
        where: and(
          eq(prompts.orgId, input.orgId),
          eq(prompts.isArchived, false),
          or(
            ilike(prompts.name, `%${input.query}%`),
            ilike(prompts.description, `%${input.query}%`)
          )
        ),
        orderBy: [desc(prompts.updatedAt)],
      });
    }),
});
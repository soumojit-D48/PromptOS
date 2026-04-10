import { z } from "zod";
import { router, protectedProc } from "../init";
import { prompts } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const promptsRouter = router({
  list: protectedProc
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.prompts.findMany({
        where: and(
          eq(prompts.orgId, input.orgId),
          eq(prompts.isArchived, false),
        ),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
    }),

  create: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      name:  z.string().min(1).max(100),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [prompt] = await ctx.db.insert(prompts).values({
        orgId:     input.orgId,
        createdBy: ctx.userId,
        name:      input.name,
        description: input.description,
      }).returning();
      return prompt;
    }),
});

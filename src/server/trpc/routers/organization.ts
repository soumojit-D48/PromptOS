import { z } from "zod";
import { router, protectedProc } from "../init";
import { organizations, orgMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const orgRouter = router({
  create: protectedProc
    .input(z.object({
      name: z.string().min(1).max(100),
      slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    }))
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug,
        })
        .returning();

      await ctx.db.insert(orgMembers).values({
        orgId: org.id,
        userId: ctx.userId,
        role: "owner",
      });

      return org;
    }),

  list: protectedProc.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, ctx.userId));

    const orgIds = memberships.map((m) => m.orgId);

    if (orgIds.length === 0) return [];

    const orgs = await ctx.db.query.organizations.findMany({
      where: (orgs, { inArray }) => inArray(orgs.id, orgIds),
    });

    return orgs;
  }),
});
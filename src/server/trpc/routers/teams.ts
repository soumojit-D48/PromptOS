import { z } from "zod";
import { router, protectedProc, orgProc } from "../init";
import { orgMembers, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const teamsRouter = router({
  members: orgProc
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: orgMembers.id,
          role: orgMembers.role,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(orgMembers)
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .where(eq(orgMembers.orgId, input.orgId));
    }),
});
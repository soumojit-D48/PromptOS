import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const createTRPCContext = cache(async () => {
  const session = await auth();
  return { db, session, userId: session?.user?.id };
});

const t = initTRPC
  .context<typeof createTRPCContext>()
  .create({ transformer: superjson });

export const router = t.router;
export const publicProc = t.procedure;

export const protectedProc = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const orgProc = protectedProc.use(async ({ ctx, next, input }) => {
  const orgId = (input as { orgId?: string })?.orgId;
  if (!orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "orgId required" });

  const membership = await ctx.db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, ctx.userId!)),
  });

  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this org" });

  return next({ ctx: { ...ctx, orgId, role: membership.role } });
});
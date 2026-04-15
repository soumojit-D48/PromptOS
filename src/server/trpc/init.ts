import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
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
  .create();

export const router = t.router;
export const publicProc = t.procedure;

export interface ContextWithOrg {
  orgId: string;
  role: "owner" | "editor" | "viewer";
}

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

export const editorProc = orgProc.use(async ({ ctx, next }) => {
  if (ctx.role !== "owner" && ctx.role !== "editor") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Editor or Owner role required",
    });
  }
  return next();
});

export const ownerProc = orgProc.use(async ({ ctx, next }) => {
  if (ctx.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner role required",
    });
  }
  return next();
});
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";

export const createTRPCContext = cache(async () => {
  const session = await auth();
  return { db, session, userId: session?.user?.id };
});

const t = initTRPC
  .context<typeof createTRPCContext>()
  .create({ transformer: superjson });

export const router      = t.router;
export const publicProc  = t.procedure;
export const protectedProc = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
import { z } from "zod";
import { router, protectedProc, orgProc, ownerProc } from "../init";
import { db } from "@/server/db";
import { apiKeys, orgMembers } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { generateApiKey, hashApiKey } from "@/lib/api-key";
import { TRPCError } from "@trpc/server";

export const apiKeysRouter = router({
  list: protectedProc
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { orgId } = input;
      
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      
      const keys = await db.query.apiKeys.findMany({
        where: and(
          eq(apiKeys.orgId, orgId),
          isNull(apiKeys.revokedAt)
        ),
      });

      return keys.map((key) => ({
        id: key.id,
        name: key.name,
        lastUsed: key.lastUsed,
        createdAt: key.createdAt,
        permissions: key.permissions,
      }));
    }),

  create: ownerProc
    .input(z.object({
      orgId: z.string(),
      name: z.string().min(1).max(100),
      permissions: z.enum(["execute", "read"]).default("execute"),
    }))
    .mutation(async ({ input }) => {
      const { orgId, name, permissions } = input;
      
      const plainKey = generateApiKey();
      const keyHash = await hashApiKey(plainKey);
      
      const [created] = await db.insert(apiKeys)
        .values({
          orgId,
          name,
          keyHash,
          permissions,
        })
        .returning();
      
      return {
        id: created.id,
        name: created.name,
        plainKey,
        permissions,
        createdAt: created.createdAt,
      };
    }),

  revoke: ownerProc
    .input(z.object({
      orgId: z.string(),
      keyId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { orgId, keyId } = input;
      
      await db.update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.orgId, orgId)
        ));
      
      return { success: true };
    }),
});
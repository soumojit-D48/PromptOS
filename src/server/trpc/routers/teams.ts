import { z } from "zod";
import { router, protectedProc, orgProc, ownerProc } from "../init";
import { orgMembers, users, organizations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const teamsRouter = router({
  members: protectedProc
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check membership
      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });

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

  invite: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(["owner", "editor", "viewer"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, email, role } = input;

      const currentMembers = await ctx.db
        .select()
        .from(orgMembers)
        .where(eq(orgMembers.orgId, orgId));

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      if (org?.plan === "free" && currentMembers.length >= 3) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Free plan allows 3 members. Upgrade to Pro to invite more.",
        });
      }

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        const existingMember = await ctx.db.query.orgMembers.findFirst({
          where: and(
            eq(orgMembers.orgId, orgId),
            eq(orgMembers.userId, existingUser.id)
          ),
        });

        if (existingMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member of this organization",
          });
        }

        await ctx.db.insert(orgMembers).values({
          orgId,
          userId: existingUser.id,
          role,
        });

        return { success: true, message: `Added ${email} to the organization` };
      }

      console.log(`[TODO] Send invite email to ${email}`);
      return { success: true, message: `Invitation sent to ${email}` };
    }),

  updateRole: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      memberId: z.string().uuid(),
      newRole: z.enum(["owner", "editor", "viewer"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, memberId, newRole } = input;

      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can change roles",
        });
      }

      const member = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)),
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (member.role === "owner") {
        const ownerCount = await ctx.db
          .select()
          .from(orgMembers)
          .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "owner")));

        if (ownerCount.length === 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot change the last owner's role",
          });
        }
      }

      await ctx.db
        .update(orgMembers)
        .set({ role: newRole })
        .where(eq(orgMembers.id, memberId));

      return { success: true };
    }),

  remove: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      memberId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, memberId } = input;

      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can remove members",
        });
      }

      const member = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)),
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (member.role === "owner") {
        const ownerCount = await ctx.db
          .select()
          .from(orgMembers)
          .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "owner")));

        if (ownerCount.length === 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last owner",
          });
        }
      }

      await ctx.db
        .delete(orgMembers)
        .where(eq(orgMembers.id, memberId));

      return { success: true };
    }),

  transferOwner: protectedProc
    .input(z.object({
      orgId: z.string().uuid(),
      newOwnerId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, newOwnerId } = input;

      const membership = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.userId!)),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      if (membership.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can transfer ownership",
        });
      }

      const newOwnerMember = await ctx.db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.id, newOwnerId), eq(orgMembers.orgId, orgId)),
      });

      if (!newOwnerMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      const currentOwnerId = (
        await ctx.db
          .select()
          .from(orgMembers)
          .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "owner")))
      )[0]?.id;

      if (!currentOwnerId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No owner found" });
      }

      await ctx.db
        .update(orgMembers)
        .set({ role: "editor" })
        .where(eq(orgMembers.id, currentOwnerId));

      await ctx.db
        .update(orgMembers)
        .set({ role: "owner" })
        .where(eq(orgMembers.id, newOwnerId));

      return { success: true };
    }),
});
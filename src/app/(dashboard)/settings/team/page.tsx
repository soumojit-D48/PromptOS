import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orgMembers, organizations, users } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const currentOrgId = memberships[0].orgId;
  const currentMember = memberships[0];

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, currentOrgId),
  });

  const members = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.orgId, currentOrgId));

  const userIds = members.map((m) => m.userId);
  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.id, userIds as any));

  const membersWithUser = members.map((m) => {
    const user = allUsers.find((u: any) => u.id === m.userId);
    return {
      id: m.id,
      role: m.role,
      userId: m.userId,
      name: user?.name || "Unknown",
      email: user?.email || "",
      image: user?.image ?? null,
    };
  });

  return (
    <TeamClient
      orgId={currentOrgId}
      currentRole={currentMember.role}
      orgPlan={org?.plan || "free"}
      members={membersWithUser}
      currentUserId={session.user.id}
    />
  );
}
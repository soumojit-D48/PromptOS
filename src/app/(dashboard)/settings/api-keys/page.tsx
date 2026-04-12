import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { orgMembers, organizations } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db.query.orgMembers.findMany({
    where: eq(orgMembers.userId, session.user.id),
  });

  if (!memberships.length) redirect("/onboarding");

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, memberships[0].orgId),
  });

  if (!org) redirect("/onboarding");

  return <ApiKeysClient orgId={org.id} />;
}
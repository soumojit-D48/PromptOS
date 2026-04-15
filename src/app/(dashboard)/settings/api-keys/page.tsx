import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  const currentOrgIdCookie = cookieStore.get("currentOrgId")?.value;

  let orgId = memberships[0].orgId;
  if (currentOrgIdCookie) {
    const hasMembership = memberships.find(m => m.orgId === currentOrgIdCookie);
    if (hasMembership) {
      orgId = currentOrgIdCookie;
    }
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) redirect("/onboarding");

  return <ApiKeysClient orgId={org.id} />;
}
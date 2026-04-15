import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { orgMembers, organizations } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { AnalyticsChart } from "@/components/analytics-chart";

export default async function AnalyticsPage() {
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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your prompt performance and usage metrics
        </p>
      </div>

      <AnalyticsChart orgId={org.id} />
    </div>
  );
}
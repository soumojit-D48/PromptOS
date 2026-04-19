import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { orgMembers, organizations } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { GlobalSearch } from "@/components/global-search";
import { OrgSwitcher } from "@/components/org-switcher";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  // Check cookie for selected org
  const cookieStore = await cookies();
  const currentOrgIdCookie = cookieStore.get("currentOrgId")?.value;
  
  // Use cookie org if user is member of it, otherwise use first membership
  let currentOrgId = memberships[0].orgId;
  if (currentOrgIdCookie) {
    const hasMembership = memberships.find(m => m.orgId === currentOrgIdCookie);
    if (hasMembership) {
      currentOrgId = currentOrgIdCookie;
    }
  }

  const orgs = await Promise.all(
    memberships.map(async (m) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, m.orgId),
      });
      return org;
    })
  );

  const validOrgs = orgs.filter((o): o is NonNullable<typeof o> => o !== null);
  const currentOrg = validOrgs.find((o) => o.id === currentOrgId) || validOrgs[0];

  return (
    <div className="flex min-h-screen">
      <GlobalSearch orgId={currentOrgId} />
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-6">
          <OrgSwitcher
            currentOrgId={currentOrgId}
            currentOrgName={currentOrg?.name || "Organization"}
            organizations={validOrgs}
          />
        </div>
        <nav className="space-y-2">
          <Link href="/prompts" className="block px-3 py-2 rounded hover:bg-gray-200">
            My Prompts
          </Link>
          <Link href="/public/prompts" className="block px-3 py-2 rounded hover:bg-gray-200">
            Public Prompts
          </Link>
          <Link href="/experiments" className="block px-3 py-2 rounded hover:bg-gray-200">
            Experiments
          </Link>
          <Link href="/analytics" className="block px-3 py-2 rounded hover:bg-gray-200">
            Analytics
          </Link>
          <Link href="/settings" className="block px-3 py-2 rounded hover:bg-gray-200">
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
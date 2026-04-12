import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orgMembers, organizations } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { GlobalSearch } from "@/components/global-search";
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

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, memberships[0].orgId),
  });

  return (
    <div className="flex min-h-screen">
      <GlobalSearch orgId={org?.id || ""} />
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-6">
          <h2 className="font-semibold">{org?.name || "Organization"}</h2>
        </div>
        <nav className="space-y-2">
          <Link href="/prompts" className="block px-3 py-2 rounded hover:bg-gray-200">
            Prompts
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
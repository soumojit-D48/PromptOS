import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { orgMembers } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { PromptsList } from "@/components/prompts-list";

export default async function PromptsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const currentOrgIdCookie = cookieStore.get("currentOrgId")?.value;

  let orgId = memberships[0].orgId;
  if (currentOrgIdCookie) {
    const hasMembership = memberships.find(m => m.orgId === currentOrgIdCookie);
    if (hasMembership) {
      orgId = currentOrgIdCookie;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Prompts</h1>
      <PromptsList orgId={orgId} />
    </div>
  );
}
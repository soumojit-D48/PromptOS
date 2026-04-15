import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { orgMembers, prompts, promptVersions } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq, and, desc } from "drizzle-orm";
import { VersionDiff } from "@/components/version-diff";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VersionHistoryPage({ params }: Props) {
  const { id } = await params;
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

  const prompt = await db.query.prompts.findFirst({
    where: and(eq(prompts.id, id), eq(prompts.orgId, orgId)),
  });

  if (!prompt) {
    redirect("/prompts");
  }

  const versions = await db.query.promptVersions.findMany({
    where: eq(promptVersions.promptId, id),
    orderBy: [desc(promptVersions.versionNum)],
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{prompt.name}</h1>
          <p className="text-muted-foreground">Version History</p>
        </div>
        <a href={`/prompts/${id}`} className="text-blue-600 hover:underline">
          Back to Editor
        </a>
      </div>

      <VersionDiff versions={versions} />
    </div>
  );
}
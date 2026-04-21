import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { orgMembers, prompts, promptVersions } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq, and, desc } from "drizzle-orm";
import { NewExperimentClient } from "./new-client";

interface Props {
  searchParams: Promise<{ promptId?: string }>;
}

export default async function NewExperimentPage({ searchParams }: Props) {
  const { promptId } = await searchParams;
  
  if (!promptId) {
    return <div className="p-6">No prompt specified</div>;
  }

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const currentOrgIdCookie = cookieStore.get("currentOrgId")?.value;

  // First get the prompt to know its orgId
  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, promptId),
  });

  if (!prompt) {
    return <div className="p-6">Prompt not found</div>;
  }

  // Use the prompt's orgId, checking if user has membership there
  let orgId = prompt.orgId;
  const hasMembership = memberships.find(m => m.orgId === orgId);
  if (!hasMembership) {
    // Fallback to user's first membership
    if (currentOrgIdCookie) {
      const fallbackMembership = memberships.find(m => m.orgId === currentOrgIdCookie);
      if (fallbackMembership) {
        orgId = currentOrgIdCookie;
      } else {
        return <div className="p-6">You don't have access to this prompt's organization</div>;
      }
    } else {
      orgId = memberships[0].orgId;
    }
  }

  if (!prompt) {
    return <div className="p-6">Prompt not found</div>;
  }

  const versionsRaw = await db.query.promptVersions.findMany({
    where: eq(promptVersions.promptId, promptId),
    orderBy: [desc(promptVersions.versionNum)],
  });

  return (
    <NewExperimentClient
      promptId={promptId}
      orgId={orgId}
      promptName={prompt.name}
      versions={versionsRaw.map((v) => ({
        id: v.id,
        versionNum: v.versionNum,
        content: v.content,
        commitMsg: v.commitMsg,
        createdAt: v.createdAt.toISOString(),
      }))}
    />
  );
}
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orgMembers, prompts, promptVersions } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { PromptEditor } from "@/components/prompt-editor";
import { VersionList } from "@/components/version-list";
import { SimilarPrompts } from "@/components/similar-prompts";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

type VersionData = {
  id: string;
  versionNum: number;
  content: string;
  model: string;
  params: { temperature: number; maxTokens: number; systemPrompt?: string };
  isPublished: boolean;
  commitMsg: string | null;
  createdAt: Date;
};

export default async function PromptDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].orgId;

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, id),
  });

  if (!prompt) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Prompt not found</h1>
      </div>
    );
  }

  const versionsRaw = await db.query.promptVersions.findMany({
    where: eq(promptVersions.promptId, id),
    orderBy: [desc(promptVersions.versionNum)],
  });

  const versions: VersionData[] = versionsRaw.map((v) => ({
    id: v.id,
    versionNum: v.versionNum,
    content: v.content,
    model: v.model,
    params: (v.params as { temperature: number; maxTokens: number; systemPrompt?: string }) || { temperature: 0.7, maxTokens: 1000 },
    isPublished: v.isPublished,
    commitMsg: v.commitMsg,
    createdAt: v.createdAt,
  }));

  const latestVersion = versions[0];
  const publishedVersion = versions.find((v) => v.isPublished);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-y-auto">
        <PromptEditor 
          prompt={prompt} 
          orgId={orgId} 
          latestVersion={latestVersion}
          publishedVersion={publishedVersion}
        />
      </div>
      <aside className="w-72 border-l p-4 bg-gray-50 overflow-y-auto">
        <div className="mb-4">
          <Link 
            href={`/experiments/new?promptId=${prompt.id}`}
            className="w-full block text-center px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Run A/B Test
          </Link>
        </div>
        <VersionList 
          promptId={prompt.id}
          orgId={orgId}
          versions={versions}
          currentVersionId={latestVersion?.id}
          publishedVersionId={publishedVersion?.id}
        />
        <SimilarPrompts 
          promptId={prompt.id}
          orgId={orgId}
        />
      </aside>
    </div>
  );
}
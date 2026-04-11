import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orgMembers, prompts } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { PromptEditor } from "@/components/prompt-editor";

interface Props {
  params: Promise<{ id: string }>;
}

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

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6">
        <PromptEditor prompt={prompt} orgId={orgId} />
      </div>
      <aside className="w-64 border-l p-4 bg-gray-50">
        <p className="text-sm text-muted-foreground">Version history will appear here</p>
      </aside>
    </div>
  );
}
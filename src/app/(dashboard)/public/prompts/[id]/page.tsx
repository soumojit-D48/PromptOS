import { db } from "@/server/db";
import { prompts, promptVersions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PublicPromptRunner } from "@/components/public-prompt-runner";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicPromptPage({ params }: Props) {
  const { id } = await params;

  const promptVersion = await db.query.promptVersions.findFirst({
    where: eq(promptVersions.id, id),
  });

  if (!promptVersion) {
    redirect("/public/prompts");
  }

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, promptVersion.promptId),
  });

  if (!prompt) {
    redirect("/public/prompts");
  }

  const versionParams = (promptVersion.params as { temperature: number; maxTokens: number; systemPrompt?: string }) || {
    temperature: 0.7,
    maxTokens: 1000,
  };

  return (
    <PublicPromptRunner
      prompt={{
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        content: promptVersion.content,
        model: promptVersion.model,
        params: versionParams,
      }}
    />
  );
}
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { orgMembers, promptVersions, prompts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { runPrompt } from "@/server/ai/run-prompt";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { versionId, input, modelOverride } = body;

  if (!versionId) {
    return new Response("versionId required", { status: 400 });
  }

  const version = await db.query.promptVersions.findFirst({
    where: eq(promptVersions.id, versionId),
  });

  if (!version) {
    return new Response("Version not found", { status: 404 });
  }

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, version.promptId),
  });

  if (!prompt) {
    return new Response("Prompt not found", { status: 404 });
  }

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (!memberships.find((m) => m.orgId === prompt.orgId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const params = (version.params as { temperature: number; maxTokens: number; systemPrompt?: string }) || {
    temperature: 0.7,
    maxTokens: 1000,
  };

  const result = await runPrompt({
    content: version.content,
    variables: input || {},
    model: modelOverride || version.model,
    params,
  });

  return new Response(result.output, {
    headers: {
      "X-Latency-Ms": result.latencyMs.toString(),
    },
  });
}
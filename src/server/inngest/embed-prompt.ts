import { inngest } from "./client";
import { db } from "@/server/db";
import { promptVersions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function embedText(text: string): Promise<number[]> {
  const response = await openrouter.embeddings.create({
    model: "nomic-ai/nomic-embed-text-v1.5",
    input: text,
  });
  
  return response.data[0].embedding;
}

export const embedPrompt = inngest.createFunction(
  { id: "embed-prompt", triggers: [{ event: "prompt/version.created" }] },
  async ({ event }: { event: { name: string; data: { versionId: string } } }) => {
    const { versionId } = event.data;

    const version = await db.query.promptVersions.findFirst({
      where: eq(promptVersions.id, versionId),
    });

    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    const embedding = await embedText(version.content);

    await db
      .update(promptVersions)
      .set({ embedding })
      .where(eq(promptVersions.id, versionId));

    return { success: true, versionId };
  }
);
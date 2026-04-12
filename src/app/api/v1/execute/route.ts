/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { apiKeys, prompts, promptVersions } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-key";
import { getModel } from "@/server/ai/openrouter";
import { inngest } from "@/server/inngest/client";

const executeSchema = z.object({
  promptId: z.string().uuid(),
  input: z.record(z.string(), z.string()),
  version: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
});

async function callAI(model: any, systemPrompt: string | undefined, content: string) {
  const aiModule: any = await import("ai");
  const result = await aiModule.generateText({ model, system: systemPrompt, prompt: content });
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("X-API-Key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const keys = await db.query.apiKeys.findMany({
      where: isNull(apiKeys.revokedAt),
    });

    let validKey = null;
    for (const key of keys) {
      const isValid = await verifyApiKey(apiKey, key.keyHash);
      if (isValid) {
        validKey = key;
        break;
      }
    }

    if (!validKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    if (validKey.revokedAt) {
      return NextResponse.json({ error: "API key revoked" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { promptId, input, version, stream } = parsed.data;

    const prompt = await db.query.prompts.findFirst({
      where: and(
        eq(prompts.id, promptId),
        eq(prompts.orgId, validKey.orgId)
      ),
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    let promptVersion;
    if (version) {
      promptVersion = await db.query.promptVersions.findFirst({
        where: and(
          eq(promptVersions.promptId, promptId),
          eq(promptVersions.versionNum, version)
        ),
      });
    } else {
      promptVersion = await db.query.promptVersions.findFirst({
        where: and(
          eq(promptVersions.promptId, promptId),
          eq(promptVersions.isPublished, true)
        ),
      });
    }

    if (!promptVersion) {
      return NextResponse.json({ error: "Published version not found" }, { status: 404 });
    }

    const versionParams = (promptVersion.params as Record<string, string>) || {};
    
    const startTime = Date.now();

    let content = String(promptVersion.content || "");
    for (const [key, value] of Object.entries(input)) {
      content = content.split(`{{${key}}`).join(String(value));
    }

    const model = getModel(String(promptVersion.model || "meta-llama/llama-3.3-70b-instruct:free"));
    const systemPrompt = versionParams.systemPrompt;
    
    const result: any = await callAI(model, systemPrompt, content);
    const text = result.text;
    
    const latencyMs = Date.now() - startTime;
    const tokensIn = Math.ceil(content.length / 4);
    const tokensOut = Math.ceil(text.length / 4);

    await db.update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, validKey.id));

    await inngest.send({
      name: "api/call.completed",
      data: {
        versionId: promptVersion.id,
        orgId: validKey.orgId,
        latencyMs,
        tokensIn,
        tokensOut,
        keyId: validKey.id,
      },
    });

    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          controller.close();
        },
      });
      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    return NextResponse.json({
      output: text,
      latencyMs,
      tokensIn,
      tokensOut,
    });
  } catch (error) {
    console.error("Execute API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
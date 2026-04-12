import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiKeys, prompts, promptVersions } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-key";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("X-API-Key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const keys = await db.query.apiKeys.findMany({
      where: and(
        isNull(apiKeys.revokedAt),
      ),
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

    const publishedPrompts = await db
      .select({
        id: prompts.id,
        name: prompts.name,
        description: prompts.description,
      })
      .from(prompts)
      .innerJoin(promptVersions, eq(prompts.id, promptVersions.promptId))
      .where(and(
        eq(prompts.orgId, validKey.orgId),
        eq(promptVersions.isPublished, true),
      ))
      .groupBy(prompts.id);

    return NextResponse.json(publishedPrompts);
  } catch (error) {
    console.error("List prompts API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
import { inngest } from "./client";
import { db } from "@/server/db";
import { experimentRuns, apiKeys } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface ApiCallCompletedData {
  versionId: string;
  orgId: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  keyId: string;
  cacheHit?: boolean;
}

export const logApiCall = inngest.createFunction(
  { id: "log-api-call", triggers: [{ event: "api/call.completed" }] },
  async ({ event }: { event: { name: string; data: ApiCallCompletedData } }) => {
    const { versionId, keyId, latencyMs, tokensIn, tokensOut } = event.data;

    await db.insert(experimentRuns).values({
      versionId,
      input: {},
      output: "api_call",
      latencyMs,
      tokensIn,
      tokensOut,
      runType: "api_call",
    });

    if (keyId) {
      await db
        .update(apiKeys)
        .set({ lastUsed: new Date() })
        .where(eq(apiKeys.id, keyId));
    }

    return { success: true, keyId };
  }
);
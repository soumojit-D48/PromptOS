import { inngest, cron } from "./client";
import { db } from "@/server/db";
import { experiments, experimentRuns, prompts, organizations, promptVersions } from "@/server/db/schema";
import { eq, gte, and } from "drizzle-orm";

export const aggregateAnalytics = inngest.createFunction(
  { id: "aggregate-analytics", triggers: [{ cron: "0 0 * * *" }] },
  async () => {
    const orgs = await db.query.organizations.findMany();

    for (const org of orgs) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0));
      const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999));

      const runs = await db.query.experimentRuns.findMany({
        where: and(
          gte(experimentRuns.createdAt, startOfDay),
        ),
      });

      const totalRuns = runs.length;
      const avgLatency = runs.length > 0
        ? runs.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / runs.length
        : 0;
      const totalTokensIn = runs.reduce((sum, r) => sum + (r.tokensIn ?? 0), 0);
      const totalTokensOut = runs.reduce((sum, r) => sum + (r.tokensOut ?? 0), 0);

      console.log(`Org ${org.id}: ${totalRuns} runs, avg latency ${avgLatency}ms, tokens in ${totalTokensIn}, tokens out ${totalTokensOut}`);
    }

    return { success: true, orgsProcessed: orgs.length };
  }
);
import { inngest } from "./client";
import { db } from "@/server/db";
import { experiments, experimentRuns, promptVersions, prompts } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { runPrompt } from "@/server/ai/run-prompt";

interface ExperimentStartedData {
  experimentId: string;
}

export const runAbVariant = inngest.createFunction(
  { id: "run-ab-variant", triggers: [{ event: "experiment/started" }] },
  async ({ event }: { event: { name: string; data: ExperimentStartedData } }) => {
    const { experimentId } = event.data;

    const experiment = await db.query.experiments.findFirst({
      where: eq(experiments.id, experimentId),
    });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const prompt = await db.query.prompts.findFirst({
      where: eq(prompts.id, experiment.promptId),
    });

    if (!prompt) {
      throw new Error(`Prompt ${experiment.promptId} not found`);
    }

    const trafficSplit = experiment.trafficSplit as Record<string, number>;
    const versionIds = Object.keys(trafficSplit);

    const versionPromises = versionIds.map(async (versionId) => {
      return db.query.promptVersions.findFirst({
        where: eq(promptVersions.id, versionId),
      });
    });
    const versions = await Promise.all(versionPromises);
    const validVersions = versions.filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined);

    const inputs = (experiment.trafficSplit as Record<string, number> & { __inputs?: Array<Record<string, string>> }).__inputs ?? [];
    const runInputs = inputs.length > 0 ? inputs : [{ test: "default" }];

    const results: Array<{ versionId: string; input: Record<string, string>; output: string; latencyMs: number }> = [];

    for (const input of runInputs) {
      for (const version of validVersions) {
        const runResult = await runPrompt({
          content: version.content,
          variables: input,
          model: version.model,
          params: version.params as { temperature: number; maxTokens: number },
        });

        await db.insert(experimentRuns).values({
          experimentId: experiment.id,
          versionId: version.id,
          input,
          output: "completed",
          latencyMs: runResult.latencyMs,
        });

        results.push({
          versionId: version.id,
          input,
          output: "done",
          latencyMs: runResult.latencyMs,
        });
      }
    }

    await db
      .update(experiments)
      .set({ status: "done", endedAt: new Date() })
      .where(eq(experiments.id, experimentId));

    await inngest.send({
      name: "experiment/completed",
      data: { experimentId },
    });

    return { success: true, experimentId, totalRuns: results.length };
  }
);
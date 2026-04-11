import { inngest } from "./client";
import { db } from "@/server/db";
import { experiments, orgMembers, users, prompts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface ExperimentCompletedData {
  experimentId: string;
}

export const notifyTeam = inngest.createFunction(
  { id: "notify-team", triggers: [{ event: "experiment/completed" }] },
  async ({ event }: { event: { name: string; data: ExperimentCompletedData } }) => {
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

    const members = await db.query.orgMembers.findMany({
      where: eq(orgMembers.orgId, prompt.orgId),
    });

    const ownersAndEditors = members.filter((m) => m.role === "owner" || m.role === "editor");

    for (const member of ownersAndEditors) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, member.userId),
      });

      if (user) {
        console.log(`Notifying ${user.email || user.name}: Experiment "${experiment.name}" has completed`);
      }
    }

    return { success: true, experimentId, notifiedCount: ownersAndEditors.length };
  }
);
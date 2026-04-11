import { serve, inngest } from "@/server/inngest/client";
import { embedPrompt } from "@/server/inngest/embed-prompt";
import { runAbVariant } from "@/server/inngest/run-ab-variant";
import { aggregateAnalytics } from "@/server/inngest/aggregate-analytics";
import { notifyTeam } from "@/server/inngest/notify-team";
import { logApiCall } from "@/server/inngest/log-api-call";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    embedPrompt,
    runAbVariant,
    aggregateAnalytics,
    notifyTeam,
    logApiCall,
  ],
});
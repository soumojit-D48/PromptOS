import { router } from "./init";
import { promptsRouter } from "./routers/prompt";
import { teamsRouter } from "./routers/teams";
import { versionsRouter } from "./routers/versions";
import { experimentsRouter } from "./routers/experiments";
import { analyticsRouter } from "./routers/analytics";
import { apiKeysRouter } from "./routers/api-keys";
import { orgRouter } from "./routers/organization";

export const appRouter = router({
  organization: orgRouter,
  prompts: promptsRouter,
  teams: teamsRouter,
  versions: versionsRouter,
  experiments: experimentsRouter,
  analytics: analyticsRouter,
  apiKeys: apiKeysRouter,
});

export type AppRouter = typeof appRouter;
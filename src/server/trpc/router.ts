import { router } from "./init";
import { promptsRouter } from "./routers/prompt";
import { teamsRouter } from "./routers/teams";
import { versionsRouter } from "./routers/versions";
import { experimentsRouter } from "./routers/experiments";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = router({
  prompts: promptsRouter,
  teams: teamsRouter,
  versions: versionsRouter,
  experiments: experimentsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
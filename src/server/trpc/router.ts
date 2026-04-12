import { router } from "./init";
import { promptsRouter } from "./routers/prompt";
import { teamsRouter } from "./routers/teams";
import { versionsRouter } from "./routers/versions";
import { experimentsRouter } from "./routers/experiments";

export const appRouter = router({
  prompts: promptsRouter,
  teams: teamsRouter,
  versions: versionsRouter,
  experiments: experimentsRouter,
});

export type AppRouter = typeof appRouter;
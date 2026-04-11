import { router } from "./init";
import { promptsRouter } from "./routers/prompt";
import { teamsRouter } from "./routers/teams";
import { versionsRouter } from "./routers/versions";

export const appRouter = router({
  prompts: promptsRouter,
  teams: teamsRouter,
  versions: versionsRouter,
  // experiments, analytics — add later 
});

export type AppRouter = typeof appRouter;
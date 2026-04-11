import { router } from "./init";
import { promptsRouter } from "./routers/prompt";
import { teamsRouter } from "./routers/teams";

export const appRouter = router({
  prompts: promptsRouter,
  teams: teamsRouter,
  // versions, experiments, analytics — add later 
});

export type AppRouter = typeof appRouter;
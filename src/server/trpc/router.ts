import { router } from "./init";
import { promptsRouter } from "./routers/prompt";

export const appRouter = router({
  prompts: promptsRouter,
  // versions, experiments, analytics, teams — add later 
});

export type AppRouter = typeof appRouter;
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "./core";

const handler = createRouteHandler({
  router: uploadRouter,
});

export { handler as GET, handler as POST };
import { Inngest, cron } from "inngest";
import { serve } from "inngest/next";

export const inngest = new Inngest({
  id: "promptos",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export { serve, cron };
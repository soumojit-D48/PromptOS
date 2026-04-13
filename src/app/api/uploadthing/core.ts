import { createUploadthing, type FileRouter } from "uploadthing/server";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const uploadRouter = {
  promptAttachment: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 3 },
    text: { maxFileSize: "16MB", maxFileCount: 3 },
    image: { maxFileSize: "16MB", maxFileCount: 3 },
  })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async () => {
      console.log("Upload complete");
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
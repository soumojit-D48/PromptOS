import { createHash } from "crypto";

export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}
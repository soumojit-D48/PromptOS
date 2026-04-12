import { randomBytes } from "crypto";

const KEY_PREFIX = "pk_live_";

export function generateApiKey(): string {
  const random = randomBytes(32).toString("base64url");
  return `${KEY_PREFIX}${random}`;
}

export async function hashApiKey(key: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(key, 12);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(key, hash);
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./upstash";

type Plan = "free" | "pro";

export async function checkRateLimit(
  keyId: string,
  plan: Plan = "free"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const config: any = {
      redis,
      prefix: `promptos:${plan}`,
      limit: plan === "free" ? 100 : 10000,
      duration: "1 d",
    };
    
    const limiter = new Ratelimit(config as any);
    const result = await limiter.limit(keyId);
    
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    return { success: true, remaining: 100, reset: 0 };
  }
}
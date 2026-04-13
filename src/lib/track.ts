"use client";

import { posthog } from "@/lib/posthog";

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  
  try {
    posthog.capture(event, properties);
  } catch (e) {
    console.warn("[PostHog] Track error:", e);
  }
}

export function getFeatureFlag(flagKey: string): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    return posthog.getFeatureFlag(flagKey) === true;
  } catch (e) {
    console.warn("[PostHog] Flag error:", e);
    return false;
  }
}

export function useFeatureFlag(flagKey: string): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    return posthog.getFeatureFlag(flagKey) === true;
  } catch (e) {
    console.warn("[PostHog] Flag error:", e);
    return false;
  }
}
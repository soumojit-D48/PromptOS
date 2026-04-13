"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/components/trpc-provider";
import { initPostHog } from "@/lib/posthog";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <SessionProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </SessionProvider>
  );
}
"use client";

import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/track";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleSignIn = async () => {
    await signIn("github", { redirectTo: "/prompts" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/prompts" });
      }}>
        <Button type="submit">Sign in with GitHub</Button>
      </form>
    </div>
  );
}
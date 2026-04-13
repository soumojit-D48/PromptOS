import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { orgMembers, prompts } from "@/server/db/schema";
import { eq, count, isNull } from "drizzle-orm";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length > 0) {
    redirect("/prompts");
  }

  return <OnboardingClient userId={session.user.id} />;
}
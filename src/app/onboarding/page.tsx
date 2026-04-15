import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { create } = await searchParams;

  // Only redirect if NOT creating new org
  if (!create) {
    const memberships = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id));

    if (memberships.length > 0) {
      redirect("/prompts");
    }
  }

  return <OnboardingClient userId={session.user.id} />;
}
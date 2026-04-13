import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { posthog } from "@/lib/posthog";
import { hashUserId } from "@/lib/hash";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    posthog.identify(hashUserId(session.user.id), {
      plan: plan || "free",
      $set: {
        plan: plan || "free",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PostHog] Identify error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
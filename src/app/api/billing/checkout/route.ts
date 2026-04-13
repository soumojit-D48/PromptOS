import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { db } from "@/server/db";
import { organizations, orgMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const member = await db.query.orgMembers.findFirst({
      where: eq(orgMembers.orgId, orgId),
    });

    if (!member || member.role !== "owner") {
      return NextResponse.json({ error: "Only owners can upgrade" }, { status: 403 });
    }

    const checkoutSession = await createCheckoutSession(orgId);

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[Billing Checkout] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
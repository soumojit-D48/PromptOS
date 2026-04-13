import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPortalSession } from "@/lib/stripe";
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
      return NextResponse.json({ error: "Only owners can manage billing" }, { status: 403 });
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org?.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const portalSession = await createPortalSession(org.stripeCustomerId);

    if (!portalSession.url) {
      return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[Billing Portal] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
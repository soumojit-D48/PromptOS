import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, constructWebhookEvent } from "@/lib/stripe";
import { db } from "@/server/db";
import { organizations } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        subscription?: string;
        customer?: string;
        metadata?: { orgId?: string };
      };
      
      if (session.metadata?.orgId) {
        await db
          .update(organizations)
          .set({
            plan: "pro",
            stripeCustomerId: session.customer,
          })
          .where(eq(organizations.id, session.metadata.orgId));
        
        console.log(`[Stripe] Org ${session.metadata.orgId} upgraded to Pro`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as { customer?: string };
      
      if (subscription.customer) {
        await db
          .update(organizations)
          .set({ plan: "free" })
          .where(eq(organizations.stripeCustomerId, subscription.customer));
        
        console.log(`[Stripe] Subscription cancelled, downgraded to free`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as {
        customer?: string;
        status?: string;
      };
      
      if (subscription.customer) {
        const newPlan = subscription.status === "active" ? "pro" : "free";
        await db
          .update(organizations)
          .set({ plan: newPlan })
          .where(eq(organizations.stripeCustomerId, subscription.customer));
        
        console.log(`[Stripe] Subscription updated to ${newPlan}`);
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
import Stripe from "stripe";
import { env } from "process";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Stripe] STRIPE_SECRET_KEY not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

const PRICE_ID = process.env.STRIPE_PRICE_ID || "price_pro_monthly";

export async function createCheckoutSession(
  orgId: string,
  successUrl: string = `${process.env.APP_URL}/settings/billing?success=true`,
  cancelUrl: string = `${process.env.APP_URL}/settings/billing?canceled=true`
) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orgId,
    },
  });

  return session;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string = `${process.env.APP_URL}/settings/billing`
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function getOrgSubscription(stripeCustomerId: string) {
  if (!stripeCustomerId) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });

  return subscriptions.data[0] || null;
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ""
  );
}
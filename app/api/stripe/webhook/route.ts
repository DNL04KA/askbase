import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionState } from "@/lib/billing";
import { jsonError } from "@/lib/api-utils";

/**
 * Stripe webhook — keeps org plan and subscription rows in sync.
 * Uses the raw request body for signature verification (required by Stripe).
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return jsonError("Webhooks not configured", 501);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing signature", 400);

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return jsonError("Invalid signature", 400);
  }

  async function applySubscription(sub: Stripe.Subscription) {
    const orgId = sub.metadata?.org_id;
    if (!orgId) return;
    const periodEnd = sub.items.data[0]?.current_period_end;
    await syncSubscriptionState({
      orgId,
      plan: sub.metadata?.plan ?? null,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        await applySubscription(sub);
      }
      break;
    }
    case "customer.subscription.updated": {
      await applySubscription(event.data.object);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const orgId = sub.metadata?.org_id;
      if (orgId) {
        await syncSubscriptionState({
          orgId,
          plan: null,
          stripeSubscriptionId: sub.id,
          status: "canceled",
          currentPeriodEnd: null,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

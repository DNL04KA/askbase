import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getBillingProvider, getSiteUrl } from "@/lib/env";
import { PLANS, getPlan, type Plan, type PlanId } from "@/lib/plans";
import type { Organization } from "@/lib/org";

/**
 * Billing provider abstraction. The UI and plan gating talk to this module
 * only — never to Stripe directly. Two providers:
 *
 *  - "mock" (default): checkout/portal simulate subscription changes in the
 *    DB. Fully functional demo mode, no external dependencies.
 *  - "stripe": real Stripe Checkout + Customer Portal + webhook sync.
 *    Selected automatically when BILLING_PROVIDER=stripe and keys are set.
 */

export interface NormalizedSubscription {
  plan: Plan;
  status: "active" | "trialing" | "canceled" | "none";
  provider: "mock" | "stripe";
  currentPeriodEnd: string | null;
}

export interface BillingRedirect {
  url: string;
  mock: boolean;
}

const MOCK_PERIOD_DAYS = 30;

/** Current subscription state for an org, normalized across providers. */
export async function getCurrentSubscription(
  org: Pick<Organization, "id" | "plan">
): Promise<NormalizedSubscription> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, plan, provider, current_period_end")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = getPlan(org.plan);
  if (!sub || org.plan === "free") {
    return { plan, status: "none", provider: getBillingProvider(), currentPeriodEnd: null };
  }
  const status =
    sub.status === "active" || sub.status === "trialing"
      ? (sub.status as "active" | "trialing")
      : "canceled";
  return {
    plan,
    status,
    provider: (sub.provider as "mock" | "stripe") ?? "mock",
    currentPeriodEnd: sub.current_period_end,
  };
}

/** Starts an upgrade. Returns a URL to redirect the browser to. */
export async function createCheckoutSession(
  org: Organization,
  userEmail: string | undefined,
  planId: Exclude<PlanId, "free">
): Promise<BillingRedirect> {
  const targetPlan = PLANS[planId];
  const siteUrl = getSiteUrl();

  if (getBillingProvider() === "mock") {
    await changePlanMock(org.id, planId);
    return {
      mock: true,
      url: `${siteUrl}/dashboard/billing?success=1&mock=1`,
    };
  }

  const stripe = getStripe();
  const admin = createAdminClient();

  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: org.name,
      metadata: { org_id: org.id },
    });
    customerId = customer.id;
    await admin
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", org.id);
  }

  const prices = await stripe.prices.list({
    lookup_keys: [targetPlan.stripeLookupKey!],
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      "Stripe prices are not set up. Run: npx tsx scripts/setup-stripe.ts"
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/billing?success=1`,
    cancel_url: `${siteUrl}/dashboard/billing?canceled=1`,
    metadata: { org_id: org.id, plan: targetPlan.id },
    subscription_data: {
      metadata: { org_id: org.id, plan: targetPlan.id },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { mock: false, url: session.url };
}

/** Opens subscription management. In mock mode this cancels back to Free. */
export async function createCustomerPortalSession(
  org: Organization
): Promise<BillingRedirect> {
  const siteUrl = getSiteUrl();

  if (getBillingProvider() === "mock") {
    await changePlanMock(org.id, "free");
    return {
      mock: true,
      url: `${siteUrl}/dashboard/billing?downgraded=1&mock=1`,
    };
  }

  if (!org.stripe_customer_id) {
    throw Object.assign(
      new Error("No billing account yet — subscribe to a plan first"),
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${siteUrl}/dashboard/billing`,
  });
  return { mock: false, url: session.url };
}

/** Mock-mode plan switch: updates the org and writes a subscription record. */
export async function changePlanMock(
  orgId: string,
  planId: PlanId
): Promise<void> {
  const admin = createAdminClient();

  const { error: orgError } = await admin
    .from("organizations")
    .update({ plan: planId, billing_provider: "mock" })
    .eq("id", orgId);
  if (orgError) throw new Error(orgError.message);

  if (planId === "free") {
    await admin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("org_id", orgId)
      .eq("provider", "mock");
    return;
  }

  const periodEnd = new Date(
    Date.now() + MOCK_PERIOD_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { error } = await admin.from("subscriptions").upsert(
    {
      org_id: orgId,
      stripe_subscription_id: `mock_${orgId}`,
      status: "active",
      plan: planId,
      provider: "mock",
      current_period_end: periodEnd,
    },
    { onConflict: "stripe_subscription_id" }
  );
  if (error) throw new Error(error.message);
}

/**
 * Pulls the customer's current subscription from Stripe and applies it.
 * Called when the billing page loads, so the plan stays correct even
 * without webhooks (local dev, missed events). No-op in mock mode.
 */
export async function syncFromStripe(org: Organization): Promise<void> {
  if (getBillingProvider() !== "stripe" || !org.stripe_customer_id) return;
  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: org.stripe_customer_id,
    status: "all",
    limit: 10,
  });
  if (subs.data.length === 0) return;

  const best =
    subs.data.find((s) => s.status === "active" || s.status === "trialing") ??
    subs.data[0];
  const periodEnd = best.items.data[0]?.current_period_end;
  await syncSubscriptionState({
    orgId: org.id,
    plan: best.metadata?.plan ?? null,
    stripeSubscriptionId: best.id,
    status: best.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  });
}

/** Applies a subscription state coming from a Stripe webhook. */
export async function syncSubscriptionState(params: {
  orgId: string;
  plan: string | null;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  const admin = createAdminClient();
  const isActive = params.status === "active" || params.status === "trialing";
  const effectivePlan =
    isActive && params.plan ? (params.plan as PlanId) : "free";

  await admin
    .from("organizations")
    .update({ plan: effectivePlan, billing_provider: "stripe" })
    .eq("id", params.orgId);

  await admin.from("subscriptions").upsert(
    {
      org_id: params.orgId,
      stripe_subscription_id: params.stripeSubscriptionId,
      status: params.status,
      plan: params.plan,
      provider: "stripe",
      current_period_end: params.currentPeriodEnd?.toISOString() ?? null,
    },
    { onConflict: "stripe_subscription_id" }
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/org";
import { checkLimit } from "@/lib/plan-limits";
import { isStripeConfigured } from "@/lib/env";
import { syncFromStripe } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlanCards } from "@/components/dashboard/plan-cards";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  // Keep the plan in sync with Stripe even without webhooks (local dev)
  let planId: string = ctx.org.plan;
  try {
    await syncFromStripe(ctx.org);
    const { data: freshOrg } = await createAdminClient()
      .from("organizations")
      .select("plan")
      .eq("id", ctx.org.id)
      .single();
    if (freshOrg) planId = freshOrg.plan;
  } catch (error) {
    console.error("Stripe sync failed:", error);
  }

  const plan = getPlan(planId);
  const [chatbots, documents, messages] = await Promise.all([
    checkLimit(ctx.org.id, "chatbots"),
    checkLimit(ctx.org.id, "documents"),
    checkLimit(ctx.org.id, "messages"),
  ]);

  const usageRows = [
    { label: "Chatbots", ...chatbots },
    { label: "Documents", ...documents },
    { label: "Messages this month", ...messages },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are on the <span className="font-medium text-foreground">{plan.name}</span> plan
          {!isStripeConfigured() && (
            <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">
              demo billing — no real charges
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {usageRows.map((row) => {
            const pct = Math.min(100, Math.round((row.used / row.limit) * 100));
            return (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.used.toLocaleString()} / {row.limit.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={pct}
                  className={pct >= 90 ? "[&_[data-slot=progress-indicator]]:bg-red-400" : ""}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <PlanCards
        currentPlan={plan.id}
        stripeConfigured={isStripeConfigured()}
      />
    </div>
  );
}

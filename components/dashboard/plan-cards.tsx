"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

function PlanCardsInner({
  currentPlan,
  stripeConfigured,
}: {
  currentPlan: PlanId;
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success")) {
      toast.success("Plan updated — welcome aboard!");
      router.replace("/dashboard/billing");
      router.refresh();
    } else if (searchParams.get("downgraded")) {
      toast.info("Subscription canceled — you are back on the Free plan.");
      router.replace("/dashboard/billing");
      router.refresh();
    } else if (searchParams.get("canceled")) {
      toast.info("Checkout canceled.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, router]);

  async function upgrade(planId: PlanId) {
    setBusy(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open portal");
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open portal");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 pt-3 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPro = plan.id === "pro";
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-visible",
                isPro && "border-primary/50",
                isCurrent && "bg-primary/5"
              )}
            >
              {isPro && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Sparkles className="size-3" />
                  Most popular
                </Badge>
              )}
              <CardContent className="flex h-full flex-col">
                <p className="font-medium">{plan.name}</p>
                <p className="mt-2">
                  <span className="text-3xl font-semibold">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={openPortal}
                      disabled={busy !== null}
                    >
                      {busy === "portal" && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPro ? "default" : "outline"}
                      onClick={() => upgrade(plan.id)}
                      disabled={busy !== null}
                    >
                      {busy === plan.id && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentPlan !== "free" && (
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={openPortal} disabled={busy !== null}>
            {busy === "portal" && <Loader2 className="size-4 animate-spin" />}
            {stripeConfigured
              ? "Manage subscription"
              : "Cancel subscription (demo)"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PlanCards(props: {
  currentPlan: PlanId;
  stripeConfigured: boolean;
}) {
  return (
    <Suspense>
      <PlanCardsInner {...props} />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, ANNUAL_DISCOUNT } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <span className={cn(!annual && "font-medium", annual && "text-muted-foreground")}>
          Monthly
        </span>
        <button
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((v) => !v)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            annual ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform",
              annual ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
        <span className={cn(annual && "font-medium", !annual && "text-muted-foreground")}>
          Annual
          <Badge variant="secondary" className="ml-2 text-primary">
            −20%
          </Badge>
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const isPro = plan.id === "pro";
          const price = annual
            ? Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT))
            : plan.priceMonthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card/60 p-6 transition-transform hover:-translate-y-1",
                isPro
                  ? "border-primary/50 shadow-[0_0_40px_oklch(0.62_0.21_288/15%)]"
                  : "border-border/60"
              )}
            >
              {isPro && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Sparkles className="size-3" />
                  Most popular
                </Badge>
              )}
              <p className="font-medium">{plan.name}</p>
              <p className="mt-3">
                <span className="text-4xl font-semibold tracking-tight">
                  ${price}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
              {annual && plan.priceMonthly > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  billed annually
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full"
                variant={isPro ? "default" : "outline"} render={<Link href="/signup" />}>
                  {plan.id === "free" ? "Start free" : `Choose ${plan.name}`}
                </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

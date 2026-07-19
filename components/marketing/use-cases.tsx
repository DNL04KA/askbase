"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, Headset, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const USE_CASES = [
  {
    id: "support",
    label: "Customer Support",
    icon: Headset,
    title: "Deflect repetitive tickets automatically",
    description:
      "Upload your help center articles and policies. The widget answers common questions on your site 24/7, so your team only handles the cases that actually need a human.",
    stat: "Teams typically automate 40–60% of incoming questions.",
  },
  {
    id: "knowledge",
    label: "Internal Knowledge Base",
    icon: BookOpen,
    title: "One place to ask about everything internal",
    description:
      "HR policies, engineering runbooks, onboarding guides — turn scattered docs into a single assistant your whole team can query in plain language.",
    stat: "Stop answering the same Slack questions every week.",
  },
  {
    id: "faq",
    label: "Product FAQ",
    icon: HelpCircle,
    title: "Answers that keep up with your product",
    description:
      "Point Askbase at your changelog, docs, and FAQ. When you ship something new, just re-upload — the bot is instantly up to date.",
    stat: "No more stale FAQ pages.",
  },
  {
    id: "onboarding",
    label: "Onboarding Assistant",
    icon: GraduationCap,
    title: "Guide new users to their first win",
    description:
      "Embed the widget in your app and let new users ask setup questions in context, with answers sourced directly from your onboarding guides.",
    stat: "Shorter time-to-value, fewer drop-offs.",
  },
];

export function UseCases() {
  const [active, setActive] = useState(USE_CASES[0].id);
  const current = USE_CASES.find((u) => u.id === active)!;

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {USE_CASES.map((u) => (
          <button
            key={u.id}
            onClick={() => setActive(u.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
              u.id === active
                ? "border-primary/50 bg-primary/12 text-foreground"
                : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <u.icon className="size-4" />
            {u.label}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
        <h3 className="text-xl font-semibold tracking-tight">
          {current.title}
        </h3>
        <p className="mt-3 text-muted-foreground">{current.description}</p>
        <p className="mt-4 text-sm font-medium text-primary">{current.stat}</p>
      </div>
    </div>
  );
}

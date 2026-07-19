"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CreditCard, MessageSquare, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Chatbots", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

export function Sidebar({ orgName, plan }: { orgName: string; plan: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Bot className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">Askbase</span>
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <p className="truncate text-sm font-medium">{orgName}</p>
        <Badge
          variant={plan === "free" ? "secondary" : "default"}
          className="mt-1.5"
        >
          {PLAN_LABELS[plan] ?? plan} plan
        </Badge>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard" ||
                pathname.startsWith("/dashboard/chatbots")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <Link
          href="/dashboard/billing"
          className="block rounded-lg border border-primary/25 bg-primary/8 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-primary/15"
        >
          {plan === "free" ? (
            <>
              <span className="font-medium text-foreground">
                Upgrade to Pro
              </span>
              <br />
              More bots, more messages, no watermark.
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">
                Manage subscription
              </span>
              <br />
              View usage and invoices.
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}

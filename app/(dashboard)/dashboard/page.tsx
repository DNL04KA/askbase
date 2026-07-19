import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, FileText, MessageSquare } from "lucide-react";
import { getCurrentContext } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateChatbotDialog } from "@/components/dashboard/create-chatbot-dialog";

export const metadata: Metadata = { title: "Chatbots" };

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: chatbots } = await admin
    .from("chatbots")
    .select("id, name, is_active, created_at, documents(count), conversations(count)")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const plan = getPlan(ctx.org.plan);
  const atLimit = (chatbots?.length ?? 0) >= plan.limits.chatbots;

  if (!chatbots || chatbots.length === 0) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Bot className="size-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Create your first chatbot
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Upload your docs, and Askbase will turn them into an AI assistant you
          can chat with and embed on your website.
        </p>
        <div className="mt-6">
          <CreateChatbotDialog atLimit={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chatbots</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {chatbots.length} of {plan.limits.chatbots} on the {plan.name} plan
          </p>
        </div>
        <CreateChatbotDialog atLimit={atLimit} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chatbots.map((bot) => {
          const docCount =
            (bot.documents as unknown as { count: number }[])?.[0]?.count ?? 0;
          const convCount =
            (bot.conversations as unknown as { count: number }[])?.[0]?.count ??
            0;
          return (
            <Link key={bot.id} href={`/dashboard/chatbots/${bot.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Bot className="size-5" />
                    </span>
                    <Badge variant={bot.is_active ? "default" : "secondary"}>
                      {bot.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="font-medium">{bot.name}</p>
                  <div className="mt-auto flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3.5" />
                      {docCount} docs
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3.5" />
                      {convCount} chats
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

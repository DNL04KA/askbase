import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ChatTab } from "@/components/chatbot/chat-tab";
import { DocumentsTab } from "@/components/chatbot/documents-tab";
import { SettingsTab } from "@/components/chatbot/settings-tab";
import { EmbedTab } from "@/components/chatbot/embed-tab";

export const metadata: Metadata = { title: "Chatbot" };

export default async function ChatbotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from("chatbots")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  if (!chatbot) notFound();

  const plan = getPlan(ctx.org.plan);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {chatbot.name}
        </h1>
        <Badge variant={chatbot.is_active ? "default" : "secondary"}>
          {chatbot.is_active ? "Active" : "Paused"}
        </Badge>
      </div>

      <Tabs defaultValue="chat" className="mt-5 flex-1">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ChatTab
            chatbotId={chatbot.id}
            welcomeMessage={chatbot.welcome_message}
            botName={chatbot.name}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab
            chatbotId={chatbot.id}
            documentLimit={plan.limits.documents}
            planName={plan.name}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsTab chatbot={chatbot} />
        </TabsContent>

        <TabsContent value="embed" className="mt-4">
          <EmbedTab
            embedToken={chatbot.embed_token}
            themeConfig={chatbot.theme_config}
            watermark={plan.watermark}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

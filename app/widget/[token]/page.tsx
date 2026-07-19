import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { WidgetChat } from "./widget-chat";

export const metadata = {
  title: "Chat",
  robots: { index: false },
};

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: chatbot } = await admin
    .from("chatbots")
    .select(
      "id, name, welcome_message, theme_config, is_active, embed_token, organizations(plan)"
    )
    .eq("embed_token", token)
    .maybeSingle();

  if (!chatbot || !chatbot.is_active) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white p-6 text-center text-sm text-gray-500">
        This chatbot is unavailable.
      </div>
    );
  }

  const plan = getPlan(
    (chatbot.organizations as unknown as { plan: string })?.plan
  );
  const theme = (chatbot.theme_config ?? {}) as {
    color?: string;
    position?: string;
    hide_watermark?: boolean;
  };
  return (
    <WidgetChat
      embedToken={chatbot.embed_token}
      botName={chatbot.name}
      welcomeMessage={chatbot.welcome_message}
      accentColor={theme.color ?? "#7c5cff"}
      showWatermark={plan.watermark}
    />
  );
}

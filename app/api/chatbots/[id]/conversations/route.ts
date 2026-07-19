import { NextResponse } from "next/server";
import { requireContext, requireChatbot } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { org } = await requireContext();
    await requireChatbot(id, org.id);

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversation_id");
    const admin = createAdminClient();

    // With ?conversation_id= returns that conversation's messages
    if (conversationId) {
      const { data: conversation } = await admin
        .from("conversations")
        .select("id, chatbot_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conversation || conversation.chatbot_id !== id) {
        return NextResponse.json({ messages: [] });
      }
      const { data: messages, error } = await admin
        .from("messages")
        .select("id, role, content, sources, tokens_used, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return NextResponse.json({ messages });
    }

    const { data: conversations, error } = await admin
      .from("conversations")
      .select("id, title, source, created_at")
      .eq("chatbot_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    return NextResponse.json({ conversations });
  } catch (error) {
    return handleApiError(error);
  }
}

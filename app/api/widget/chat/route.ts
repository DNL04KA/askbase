import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLimit } from "@/lib/plan-limits";
import { runChat } from "@/lib/chat-service";
import { handleApiError, jsonError } from "@/lib/api-utils";

export const maxDuration = 60;

const widgetChatSchema = z.object({
  embed_token: z.string().uuid(),
  message: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().nullish(),
  visitor_id: z.string().max(64).nullish(),
});

// Simple in-memory rate limit per visitor per day (best-effort on serverless).
const RATE_LIMIT_PER_DAY = 50;
const rateBuckets = new Map<string, { day: string; count: number }>();

function checkRateLimit(key: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.day !== today) {
    rateBuckets.set(key, { day: today, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_DAY) return false;
  bucket.count += 1;
  return true;
}

/** Public chat endpoint used by the embeddable widget (no auth, token-scoped). */
export async function POST(request: Request) {
  try {
    const body = widgetChatSchema.safeParse(await request.json());
    if (!body.success) return jsonError("Invalid request body", 400);

    const admin = createAdminClient();
    const { data: chatbot } = await admin
      .from("chatbots")
      .select("id, org_id, system_prompt, is_active")
      .eq("embed_token", body.data.embed_token)
      .maybeSingle();

    if (!chatbot) return jsonError("Chatbot not found", 404);
    if (!chatbot.is_active) {
      return jsonError("This chatbot is currently paused", 403);
    }

    const visitorKey = `${chatbot.id}:${body.data.visitor_id ?? "anon"}`;
    if (!checkRateLimit(visitorKey)) {
      return jsonError("Daily message limit reached. Try again tomorrow.", 429);
    }

    const limit = await checkLimit(chatbot.org_id, "messages");
    if (!limit.allowed) {
      return jsonError(
        "This chatbot has reached its monthly message limit.",
        403
      );
    }

    return await runChat({
      chatbot,
      message: body.data.message,
      conversationId: body.data.conversation_id,
      source: "widget",
      visitorId: body.data.visitor_id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

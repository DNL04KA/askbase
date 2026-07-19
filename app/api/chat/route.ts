import { z } from "zod";
import { requireContext, requireChatbot } from "@/lib/org";
import { checkLimit } from "@/lib/plan-limits";
import { runChat } from "@/lib/chat-service";
import { handleApiError, jsonError } from "@/lib/api-utils";

export const maxDuration = 60;

const chatSchema = z.object({
  chatbot_id: z.string().uuid(),
  message: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().nullish(),
});

export async function POST(request: Request) {
  try {
    const { org } = await requireContext();

    const body = chatSchema.safeParse(await request.json());
    if (!body.success) return jsonError("Invalid request body", 400);

    const chatbot = await requireChatbot(body.data.chatbot_id, org.id);

    const limit = await checkLimit(org.id, "messages");
    if (!limit.allowed) {
      return jsonError(
        `Monthly message limit reached (${limit.limit} on the ${limit.plan.name} plan). Upgrade for more.`,
        403
      );
    }

    return await runChat({
      chatbot,
      message: body.data.message,
      conversationId: body.data.conversation_id,
      source: "app",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

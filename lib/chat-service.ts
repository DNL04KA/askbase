import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildRagSystemPrompt,
  embedText,
  getChatModels,
  getOpenAI,
  isCustomProvider,
  type RagSource,
} from "@/lib/ai";
import { recordMessageUsage } from "@/lib/plan-limits";

const MATCH_COUNT = 5;
const MATCH_THRESHOLD = 0.3; // text-embedding-3 similarities run lower than ada-002
const HISTORY_LIMIT = 10;

export interface ChatRequestOptions {
  chatbot: {
    id: string;
    org_id: string;
    system_prompt: string;
  };
  message: string;
  conversationId?: string | null;
  source: "app" | "widget";
  visitorId?: string | null;
}

/**
 * Shared RAG chat pipeline for both the dashboard chat and the public widget.
 * Returns an SSE stream with events:
 *   {type:"meta", conversation_id}
 *   {type:"chunk", content}
 *   {type:"sources", sources: [...]}
 *   {type:"done", tokens_used}
 *   {type:"error", message}
 */
export async function runChat({
  chatbot,
  message,
  conversationId,
  source,
  visitorId,
}: ChatRequestOptions): Promise<Response> {
  const admin = createAdminClient();

  // 1. Ensure a conversation exists
  let convId = conversationId ?? null;
  if (convId) {
    const { data: conv } = await admin
      .from("conversations")
      .select("id, chatbot_id")
      .eq("id", convId)
      .maybeSingle();
    if (!conv || conv.chatbot_id !== chatbot.id) convId = null;
  }
  if (!convId) {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({
        chatbot_id: chatbot.id,
        source,
        visitor_id: visitorId ?? null,
        title: message.slice(0, 80),
      })
      .select("id")
      .single();
    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    convId = conv.id;
  }

  // 2. Retrieve context via vector search
  const queryEmbedding = await embedText(message);
  const { data: matches, error: matchError } = await admin.rpc(
    "match_documents",
    {
      query_embedding: JSON.stringify(queryEmbedding),
      target_chatbot_id: chatbot.id,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    }
  );
  if (matchError) console.error("match_documents failed:", matchError.message);

  const contextChunks = (matches ?? []) as {
    document_title: string;
    content: string;
    similarity: number;
  }[];

  const sources: RagSource[] = contextChunks.map((c) => ({
    document_title: c.document_title,
    chunk_content_preview:
      c.content.length > 220 ? `${c.content.slice(0, 220)}…` : c.content,
    similarity: Math.round(c.similarity * 100) / 100,
  }));

  // 3. Recent history for conversational continuity
  const { data: history } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  const historyMessages = (history ?? []).reverse() as {
    role: "user" | "assistant";
    content: string;
  }[];

  // 4. Persist the user message
  const { error: userMsgError } = await admin.from("messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });
  if (userMsgError) throw new Error(userMsgError.message);

  // 5. Stream the completion
  const openai = getOpenAI();
  const chatMessages = [
    {
      role: "system" as const,
      content: buildRagSystemPrompt(chatbot.system_prompt, contextChunks),
    },
    ...historyMessages,
    { role: "user" as const, content: message },
  ];

  // Try the primary model, falling back on overload/rate-limit errors.
  const models = getChatModels();
  let completion: AsyncIterable<ChatCompletionChunk> | null = null;
  {
    let lastError: unknown = null;
    for (const model of models) {
      try {
        completion = await openai.chat.completions.create(
          {
            model,
            stream: true,
            // stream_options is OpenAI-specific; compat endpoints (Gemini)
            // reject it. On Gemini, disable thinking: RAG extraction doesn't
            // need it and it adds seconds of latency before the first token.
            ...(isCustomProvider()
              ? { reasoning_effort: "none" as "low" }
              : { stream_options: { include_usage: true } }),
            temperature: 0.3,
            messages: chatMessages,
          },
          // Skip SDK-internal retries: our loop switches to a fallback model
          // immediately instead of hammering an overloaded one with backoff.
          { maxRetries: 0 }
        );
        break;
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number })?.status;
        if (status !== 429 && status !== 503) throw error;
        console.warn(`Model ${model} unavailable (${status}), trying fallback`);
      }
    }
    if (!completion) throw lastError;
  }

  const encoder = new TextEncoder();
  const orgId = chatbot.org_id;
  const finalConvId = convId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      let fullText = "";
      let tokensUsed: number | null = null;

      try {
        send({ type: "meta", conversation_id: finalConvId });

        for await (const part of completion) {
          const delta = part.choices[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            send({ type: "chunk", content: delta });
          }
          if (part.usage) tokensUsed = part.usage.total_tokens;
        }

        send({ type: "sources", sources });
        send({ type: "done", tokens_used: tokensUsed });

        await admin.from("messages").insert({
          conversation_id: finalConvId,
          role: "assistant",
          content: fullText,
          sources,
          tokens_used: tokensUsed,
        });
        await recordMessageUsage(orgId);
      } catch (error) {
        console.error("Streaming error:", error);
        send({
          type: "error",
          message: "The assistant could not finish the reply. Please retry.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export interface SseEvents {
  onMeta?: (conversationId: string) => void;
  onChunk?: (content: string) => void;
  onSources?: (sources: SourceInfo[]) => void;
  onDone?: (tokensUsed: number | null) => void;
  onError?: (message: string) => void;
}

export interface SourceInfo {
  document_title: string;
  chunk_content_preview: string;
  similarity: number;
}

/** Reads our chat SSE stream (data: {json}\n\n frames) and dispatches events. */
export async function consumeChatStream(
  response: Response,
  events: SseEvents
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        switch (payload.type) {
          case "meta":
            events.onMeta?.(payload.conversation_id);
            break;
          case "chunk":
            events.onChunk?.(payload.content);
            break;
          case "sources":
            events.onSources?.(payload.sources ?? []);
            break;
          case "done":
            events.onDone?.(payload.tokens_used ?? null);
            break;
          case "error":
            events.onError?.(payload.message ?? "Unknown error");
            break;
        }
      } catch {
        // ignore malformed frames
      }
    }
  }
}

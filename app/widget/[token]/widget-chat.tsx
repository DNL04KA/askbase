"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { consumeChatStream } from "@/lib/sse-client";

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const VISITOR_KEY = "askbase_visitor_id";
const CONV_KEY_PREFIX = "askbase_conv_";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "v_anonymous";
  }
}

export function WidgetChat({
  embedToken,
  botName,
  welcomeMessage,
  accentColor,
  showWatermark,
}: {
  embedToken: string;
  botName: string;
  welcomeMessage: string;
  accentColor: string;
  showWatermark: boolean;
}) {
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmbedded =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embedded") === "1";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONV_KEY_PREFIX + embedToken);
      if (saved) setConversationId(saved);
    } catch {
      /* localStorage unavailable */
    }
  }, [embedToken]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embed_token: embedToken,
          message: text,
          conversation_id: conversationId,
          visitor_id: getVisitorId(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      await consumeChatStream(res, {
        onMeta: (convId) => {
          setConversationId(convId);
          try {
            localStorage.setItem(CONV_KEY_PREFIX + embedToken, convId);
          } catch {
            /* ignore */
          }
        },
        onChunk: (content) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + content } : m
            )
          ),
        onError: (message) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || message, streaming: false }
                : m
            )
          ),
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  err instanceof Error ? err.message : "Something went wrong",
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      setSending(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-white text-gray-900">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{botName}</p>
          <p className="text-xs text-white/80">Usually replies instantly</p>
        </div>
        {isEmbedded && (
          <button
            onClick={() =>
              window.parent.postMessage({ type: "askbase:close" }, "*")
            }
            aria-label="Close chat"
            className="rounded p-1 hover:bg-white/15 sm:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="space-y-3">
          <div className="flex">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm shadow-sm">
              {welcomeMessage}
            </div>
          </div>

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm shadow-sm">
                  {m.content ? (
                    <div className="prose prose-sm max-w-none [&_p]:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="flex gap-1 py-1" aria-label="Typing">
                      <span className="typing-dot size-1.5 rounded-full bg-gray-400" />
                      <span className="typing-dot size-1.5 rounded-full bg-gray-400" />
                      <span className="typing-dot size-1.5 rounded-full bg-gray-400" />
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            className="h-10 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-gray-300"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 3 3 9-3 9 19-9Z" />
              <path d="M6 12h16" />
            </svg>
          </button>
        </form>
        {showWatermark && (
          <p className="pt-2 text-center text-[11px] text-gray-400">
            Powered by{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL ?? "/"}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gray-500 hover:underline"
            >
              Askbase
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

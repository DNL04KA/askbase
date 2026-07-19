"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Bot,
  ChevronDown,
  FileText,
  Loader2,
  MessageSquarePlus,
  SendHorizonal,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { consumeChatStream, type SourceInfo } from "@/lib/sse-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceInfo[];
  tokens_used?: number | null;
  streaming?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  source: string;
  created_at: string;
}

export function ChatTab({
  chatbotId,
  welcomeMessage,
  botName,
}: {
  chatbotId: string;
  welcomeMessage: string;
  botName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/chatbots/${chatbotId}/conversations`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
  }, [chatbotId]);

  useEffect(() => {
    // initial fetch-on-mount; state updates happen after the fetch resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function openConversation(id: string) {
    setConversationId(id);
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/chatbots/${chatbotId}/conversations?conversation_id=${id}`
      );
      const data = await res.json();
      setMessages(
        (data.messages ?? []).map(
          (m: {
            id: string;
            role: "user" | "assistant";
            content: string;
            sources?: SourceInfo[];
            tokens_used?: number | null;
          }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources ?? undefined,
            tokens_used: m.tokens_used,
          })
        )
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbot_id: chatbotId,
          message: text,
          conversation_id: conversationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send message");
      }

      let isNewConversation = false;
      await consumeChatStream(res, {
        onMeta: (convId) => {
          if (!conversationId) isNewConversation = true;
          setConversationId(convId);
        },
        onChunk: (content) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + content } : m
            )
          ),
        onSources: (sources) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))
          ),
        onDone: (tokens) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, tokens_used: tokens, streaming: false }
                : m
            )
          ),
        onError: (message) => {
          toast.error(message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m
            )
          );
        },
      });

      if (isNewConversation) loadConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[480px] gap-4">
      {/* Conversations sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col rounded-xl border border-border/60 bg-card/50 lg:flex">
        <div className="p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={newConversation}
          >
            <MessageSquarePlus className="size-4" />
            New conversation
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={cn(
                "w-full truncate rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                c.id === conversationId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <span className="block truncate">{c.title || "Untitled"}</span>
              <span className="mt-0.5 block text-[10px] opacity-60">
                {c.source === "widget" ? "Widget" : "App"} ·{" "}
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border/60 bg-card/50">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Bot className="size-6" />
              </div>
              <p className="mt-4 text-sm font-medium">{botName}</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {welcomeMessage}
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for a new line)"
              rows={1}
              className="max-h-40 min-h-10 resize-none"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizonal className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary" : "bg-primary/15 text-primary"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      <div className={cn("min-w-0 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-left text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-secondary/70"
          )}
        >
          {message.content ? (
            <div className="prose prose-sm prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background/60 [&_pre]:p-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : message.streaming ? (
            <span className="flex gap-1 py-1" aria-label="Assistant is typing">
              <span className="typing-dot size-1.5 rounded-full bg-current" />
              <span className="typing-dot size-1.5 rounded-full bg-current" />
              <span className="typing-dot size-1.5 rounded-full bg-current" />
            </span>
          ) : null}
        </div>

        {!isUser && (message.sources?.length || message.tokens_used) ? (
          <div className="mt-1.5 text-left">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {message.sources && message.sources.length > 0 && (
                <button
                  onClick={() => setSourcesOpen((v) => !v)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <FileText className="size-3" />
                  {message.sources.length} source
                  {message.sources.length > 1 ? "s" : ""}
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      sourcesOpen && "rotate-180"
                    )}
                  />
                </button>
              )}
              {message.tokens_used ? (
                <span>{message.tokens_used} tokens</span>
              ) : null}
            </div>

            {sourcesOpen && message.sources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 bg-background/40 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {s.document_title}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {Math.round(s.similarity * 100)}% match
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-muted-foreground">
                      {s.chunk_content_preview}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

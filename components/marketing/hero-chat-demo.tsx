"use client";

import { useEffect, useState } from "react";
import { Bot, FileText } from "lucide-react";

const DEMO_QUESTION = "What's your refund policy?";
const DEMO_ANSWER =
  "You can request a full refund within 30 days of purchase — no questions asked. Just email support@acme.com with your order number and we'll process it within 2 business days.";

/** Self-playing chat animation for the hero section. */
export function HeroChatDemo() {
  const [phase, setPhase] = useState<"idle" | "question" | "typing" | "answer">(
    "idle"
  );
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("question"), 600));
    timers.push(setTimeout(() => setPhase("typing"), 1400));
    timers.push(setTimeout(() => setPhase("answer"), 2600));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "answer") return;
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setAnswerText(DEMO_ANSWER.slice(0, i));
      if (i >= DEMO_ANSWER.length) clearInterval(interval);
    }, 24);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="glow mx-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 backdrop-blur">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bot className="size-4" />
        </span>
        <div>
          <p className="text-xs font-medium">Acme Support Bot</p>
          <p className="text-[10px] text-muted-foreground">
            Trained on 12 documents
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      <div className="min-h-56 space-y-3 p-4 text-left">
        {phase !== "idle" && (
          <div className="flex justify-end">
            <div className="animate-rise rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
              {DEMO_QUESTION}
            </div>
          </div>
        )}

        {phase === "typing" && (
          <div className="flex">
            <div className="animate-rise flex gap-1 rounded-2xl rounded-bl-sm bg-secondary/70 px-3.5 py-3">
              <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
              <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
              <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}

        {phase === "answer" && (
          <div className="flex">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-secondary/70 px-3.5 py-2.5 text-sm">
              {answerText}
              {answerText.length >= DEMO_ANSWER.length && (
                <span className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <FileText className="size-3" />
                  Source: refund-policy.pdf · 94% match
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

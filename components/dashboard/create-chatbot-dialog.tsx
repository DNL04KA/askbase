"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateChatbotDialog({ atLimit }: { atLimit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [welcome, setWelcome] = useState("Hi! Ask me anything about our docs.");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, welcome_message: welcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create chatbot");
      toast.success("Chatbot created");
      setOpen(false);
      router.push(`/dashboard/chatbots/${data.chatbot.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (atLimit) {
    return (
      <Button
        onClick={() =>
          toast.info("Chatbot limit reached — upgrade your plan to add more.", {
            action: {
              label: "See plans",
              onClick: () => router.push("/dashboard/billing"),
            },
          })
        }
      >
        <Plus className="size-4" />
        New chatbot
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New chatbot
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a chatbot</DialogTitle>
          <DialogDescription>
            You can change everything later in Settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name">Name</Label>
            <Input
              id="bot-name"
              placeholder="Support Assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bot-welcome">Welcome message</Label>
            <Textarea
              id="bot-welcome"
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create chatbot
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

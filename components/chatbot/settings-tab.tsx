"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ChatbotSettings {
  id: string;
  name: string;
  system_prompt: string;
  welcome_message: string;
  is_active: boolean;
  theme_config: {
    color?: string;
    position?: "bottom-right" | "bottom-left";
    hide_watermark?: boolean;
  };
}

export function SettingsTab({ chatbot }: { chatbot: ChatbotSettings }) {
  const router = useRouter();
  const [name, setName] = useState(chatbot.name);
  const [systemPrompt, setSystemPrompt] = useState(chatbot.system_prompt);
  const [welcome, setWelcome] = useState(chatbot.welcome_message);
  const [isActive, setIsActive] = useState(chatbot.is_active);
  const [color, setColor] = useState(chatbot.theme_config?.color ?? "#7c5cff");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(
    chatbot.theme_config?.position ?? "bottom-right"
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          system_prompt: systemPrompt,
          welcome_message: welcome,
          is_active: isActive,
          theme_config: {
            ...chatbot.theme_config,
            color,
            position,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBot() {
    if (
      !confirm(
        `Delete "${chatbot.name}" with all its documents and conversations? This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/chatbots/${chatbot.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Chatbot deleted");
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            How the assistant introduces itself and behaves
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-welcome">Welcome message</Label>
              <Textarea
                id="settings-welcome"
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-prompt">System prompt</Label>
              <Textarea
                id="settings-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                maxLength={4000}
              />
              <p className="text-xs text-muted-foreground">
                Sets the assistant&apos;s personality and rules. Retrieved
                document context is appended automatically.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-color">Widget accent color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="settings-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    pattern="^#[0-9a-fA-F]{6}$"
                    className="w-28 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Widget position</Label>
                <div className="flex gap-2">
                  {(["bottom-right", "bottom-left"] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={position === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPosition(p)}
                    >
                      {p === "bottom-right" ? "Bottom right" : "Bottom left"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  When paused, the widget stops answering on your site.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-500/25">
        <CardHeader>
          <CardTitle className="text-red-400">Danger zone</CardTitle>
          <CardDescription>
            Deletes the chatbot, its documents, and all conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={deleteBot} disabled={deleting}>
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete chatbot
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

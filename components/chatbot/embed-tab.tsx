"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmbedTab({
  embedToken,
  themeConfig,
  watermark,
}: {
  embedToken: string;
  themeConfig: { color?: string; position?: string } | null;
  watermark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";

  const embedCode = `<script src="${origin}/widget.js" data-token="${embedToken}" data-position="${themeConfig?.position ?? "bottom-right"}" data-color="${themeConfig?.color ?? "#7c5cff"}" async></script>`;

  async function copyCode() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Embed on your website</CardTitle>
            <CardDescription>
              Paste this snippet before the closing &lt;/body&gt; tag. The chat
              bubble appears instantly — no rebuild needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-4 text-xs leading-relaxed">
              <code>{embedCode}</code>
            </pre>
            <div className="flex gap-2">
              <Button onClick={copyCode}>
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy embed code"}
              </Button>
              <Button variant="outline" render={<a href={`/widget/${embedToken}`}
                  target="_blank"
                  rel="noreferrer" />}>
                  <ExternalLink className="size-4" />
                  Open standalone
                </Button>
            </div>
            {watermark && (
              <p className="text-xs text-muted-foreground">
                The Free plan shows a &quot;Powered by Askbase&quot; watermark.
                Upgrade to Pro to remove it.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
            <CardDescription>
              Customize via data attributes — or set defaults in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                  data-position
                </code>{" "}
                — <code className="text-xs">bottom-right</code> or{" "}
                <code className="text-xs">bottom-left</code>
              </li>
              <li>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                  data-color
                </code>{" "}
                — hex accent color of the bubble and header
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
          <CardDescription>
            This is the exact widget your visitors will see.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[480px] overflow-hidden rounded-xl border border-border/60 bg-background/40">
            <iframe
              src={`/widget/${embedToken}`}
              title="Widget preview"
              className="h-full w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

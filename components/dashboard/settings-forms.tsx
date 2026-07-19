"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

export function SettingsForms({
  orgName: initialOrgName,
  fullName: initialFullName,
  email,
}: {
  orgName: string;
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(initialOrgName);
  const [fullName, setFullName] = useState(initialFullName);
  const [saving, setSaving] = useState<string | null>(null);

  async function save(payload: object, key: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({ full_name: fullName }, "profile");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={80}
              />
            </div>
            <Button type="submit" disabled={saving !== null}>
              {saving === "profile" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            Shown in the dashboard and on invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({ org_name: orgName }, "org");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="org-name">Workspace name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                maxLength={80}
              />
            </div>
            <Button type="submit" disabled={saving !== null}>
              {saving === "org" && <Loader2 className="size-4 animate-spin" />}
              Save workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

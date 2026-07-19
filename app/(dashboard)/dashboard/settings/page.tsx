import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForms } from "@/components/dashboard/settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", ctx.user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and workspace
        </p>
      </div>
      <SettingsForms
        orgName={ctx.org.name}
        fullName={profile?.full_name ?? ""}
        email={ctx.user.email ?? ""}
      />
    </div>
  );
}

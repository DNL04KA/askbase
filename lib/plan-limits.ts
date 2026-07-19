import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, type Plan } from "@/lib/plans";

export type LimitResource = "chatbots" | "documents" | "messages";

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
  plan: Plan;
}

/** First day of the current month (UTC) as YYYY-MM-DD. */
function monthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function checkLimit(
  orgId: string,
  resource: LimitResource
): Promise<LimitCheck> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();
  const plan = getPlan(org?.plan);

  let used = 0;

  if (resource === "chatbots") {
    const { count } = await admin
      .from("chatbots")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    used = count ?? 0;
  } else if (resource === "documents") {
    const { data: bots } = await admin
      .from("chatbots")
      .select("id")
      .eq("org_id", orgId);
    const botIds = (bots ?? []).map((b) => b.id);
    if (botIds.length > 0) {
      const { count } = await admin
        .from("documents")
        .select("id", { count: "exact", head: true })
        .in("chatbot_id", botIds);
      used = count ?? 0;
    }
  } else {
    const { data: rows } = await admin
      .from("usage_stats")
      .select("messages_count")
      .eq("org_id", orgId)
      .gte("stat_date", monthStart());
    used = (rows ?? []).reduce((sum, r) => sum + (r.messages_count ?? 0), 0);
  }

  const limit =
    resource === "chatbots"
      ? plan.limits.chatbots
      : resource === "documents"
        ? plan.limits.documents
        : plan.limits.messagesPerMonth;

  return { allowed: used < limit, used, limit, plan };
}

/** Atomically bumps today's message counter for the org. */
export async function recordMessageUsage(orgId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("increment_message_usage", {
    target_org_id: orgId,
  });
  if (error) console.error("Failed to record usage:", error.message);
}

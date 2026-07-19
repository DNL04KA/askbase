import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  plan: "free" | "pro" | "business";
  stripe_customer_id: string | null;
  created_at: string;
}

export interface CurrentContext {
  user: User;
  org: Organization;
}

/**
 * Returns the signed-in user and their organization.
 * Creates the organization on first login (using signup metadata).
 * Returns null when unauthenticated.
 */
export async function getCurrentContext(): Promise<CurrentContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id, organizations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.organizations) {
    return {
      user,
      org: membership.organizations as unknown as Organization,
    };
  }

  // First login — bootstrap an organization for the user.
  const fallbackName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "My";
  const orgName =
    (user.user_metadata?.org_name as string | undefined) ||
    `${fallbackName}'s workspace`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, owner_id: user.id })
    .select()
    .single();
  if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" });
  if (memberError) throw new Error(`Failed to add member: ${memberError.message}`);

  return { user, org: org as Organization };
}

/** API-route guard: returns context or throws a 401-shaped error. */
export async function requireContext(): Promise<CurrentContext> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    const err = new Error("Unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return ctx;
}

/** Verifies that a chatbot belongs to the caller's org. Returns the chatbot row. */
export async function requireChatbot(chatbotId: string, orgId: string) {
  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from("chatbots")
    .select("*")
    .eq("id", chatbotId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!chatbot) {
    const err = new Error("Chatbot not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  return chatbot;
}

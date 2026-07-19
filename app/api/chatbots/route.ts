import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext } from "@/lib/org";
import { checkLimit } from "@/lib/plan-limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError, jsonError } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  welcome_message: z.string().max(300).optional(),
  system_prompt: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    const { org } = await requireContext();

    const limit = await checkLimit(org.id, "chatbots");
    if (!limit.allowed) {
      return jsonError(
        `Chatbot limit reached (${limit.limit} on the ${limit.plan.name} plan). Upgrade to add more.`,
        403
      );
    }

    const body = createSchema.safeParse(await request.json());
    if (!body.success) return jsonError("Invalid request body", 400);

    const admin = createAdminClient();
    const { data: chatbot, error } = await admin
      .from("chatbots")
      .insert({
        org_id: org.id,
        name: body.data.name,
        ...(body.data.welcome_message
          ? { welcome_message: body.data.welcome_message }
          : {}),
        ...(body.data.system_prompt
          ? { system_prompt: body.data.system_prompt }
          : {}),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ chatbot }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { org } = await requireContext();
    const admin = createAdminClient();
    const { data: chatbots, error } = await admin
      .from("chatbots")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ chatbots });
  } catch (error) {
    return handleApiError(error);
  }
}

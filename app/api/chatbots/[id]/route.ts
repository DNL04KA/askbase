import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext, requireChatbot } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError, jsonError } from "@/lib/api-utils";

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  system_prompt: z.string().max(4000).optional(),
  welcome_message: z.string().max(300).optional(),
  is_active: z.boolean().optional(),
  theme_config: z
    .object({
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      position: z.enum(["bottom-right", "bottom-left"]),
      hide_watermark: z.boolean().optional(),
    })
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { org } = await requireContext();
    const chatbot = await requireChatbot(id, org.id);
    return NextResponse.json({ chatbot });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { org } = await requireContext();
    await requireChatbot(id, org.id);

    const body = updateSchema.safeParse(await request.json());
    if (!body.success) return jsonError("Invalid request body", 400);

    const admin = createAdminClient();
    const { data: chatbot, error } = await admin
      .from("chatbots")
      .update(body.data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ chatbot });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { org } = await requireContext();
    await requireChatbot(id, org.id);

    const admin = createAdminClient();

    // Remove uploaded files from storage before the cascade delete
    const { data: docs } = await admin
      .from("documents")
      .select("file_path")
      .eq("chatbot_id", id)
      .not("file_path", "is", null);
    const paths = (docs ?? [])
      .map((d) => d.file_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await admin.storage.from("documents").remove(paths);
    }

    const { error } = await admin.from("chatbots").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

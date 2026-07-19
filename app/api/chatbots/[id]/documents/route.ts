import { NextResponse } from "next/server";
import { requireContext, requireChatbot } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { org } = await requireContext();
    await requireChatbot(id, org.id);

    const admin = createAdminClient();
    const { data: documents, error } = await admin
      .from("documents")
      .select(
        "id, title, source_type, status, error_message, chunk_count, created_at"
      )
      .eq("chatbot_id", id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return NextResponse.json({ documents });
  } catch (error) {
    return handleApiError(error);
  }
}

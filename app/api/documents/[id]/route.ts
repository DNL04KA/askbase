import { NextResponse } from "next/server";
import { requireContext } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError, jsonError } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { org } = await requireContext();
    const admin = createAdminClient();

    const { data: document } = await admin
      .from("documents")
      .select("id, file_path, chatbots!inner(org_id)")
      .eq("id", id)
      .maybeSingle();
    const docOrgId = (
      document?.chatbots as unknown as { org_id: string } | undefined
    )?.org_id;
    if (!document || docOrgId !== org.id) {
      return jsonError("Document not found", 404);
    }

    if (document.file_path) {
      await admin.storage.from("documents").remove([document.file_path]);
    }

    // Chunks are removed by the ON DELETE CASCADE constraint
    const { error } = await admin.from("documents").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { requireContext, requireChatbot } from "@/lib/org";
import { checkLimit } from "@/lib/plan-limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError, jsonError } from "@/lib/api-utils";
import { getExtension, MAX_FILE_SIZE_BYTES } from "@/lib/document-processor";

/**
 * Accepts multipart/form-data:
 *  - chatbot_id (required)
 *  - file (PDF/TXT/MD/DOCX)  OR  title + text (pasted content)
 */
export async function POST(request: Request) {
  try {
    const { org } = await requireContext();
    const form = await request.formData();

    const chatbotId = form.get("chatbot_id");
    if (typeof chatbotId !== "string" || !chatbotId) {
      return jsonError("chatbot_id is required", 400);
    }
    await requireChatbot(chatbotId, org.id);

    const limit = await checkLimit(org.id, "documents");
    if (!limit.allowed) {
      return jsonError(
        `Document limit reached (${limit.limit} on the ${limit.plan.name} plan). Upgrade to add more.`,
        403
      );
    }

    const admin = createAdminClient();
    const file = form.get("file");
    const pastedText = form.get("text");
    const pastedTitle = form.get("title");

    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return jsonError("File is too large (max 10 MB)", 400);
      }
      const ext = getExtension(file.name);
      if (!ext) {
        return jsonError("Unsupported file type. Use PDF, TXT, MD or DOCX.", 400);
      }

      const filePath = `${org.id}/${chatbotId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(filePath, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: document, error } = await admin
        .from("documents")
        .insert({
          chatbot_id: chatbotId,
          title: file.name,
          source_type: "file",
          file_path: filePath,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      return NextResponse.json({ document }, { status: 201 });
    }

    if (typeof pastedText === "string" && pastedText.trim()) {
      const title =
        typeof pastedTitle === "string" && pastedTitle.trim()
          ? pastedTitle.trim().slice(0, 120)
          : "Pasted text";

      const filePath = `${org.id}/${chatbotId}/${Date.now()}-pasted.txt`;
      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(filePath, new Blob([pastedText], { type: "text/plain" }));
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: document, error } = await admin
        .from("documents")
        .insert({
          chatbot_id: chatbotId,
          title,
          source_type: "text",
          file_path: filePath,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      return NextResponse.json({ document }, { status: 201 });
    }

    return jsonError("Provide a file or pasted text", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { requireContext } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError, jsonError } from "@/lib/api-utils";
import {
  chunkText,
  extractText,
  generateEmbeddings,
  getExtension,
} from "@/lib/document-processor";

export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/** Extracts text, chunks it, embeds every chunk, and stores the vectors. */
export async function POST(_request: Request, { params }: Params) {
  const admin = createAdminClient();
  let documentId: string | null = null;

  try {
    const { id } = await params;
    documentId = id;
    const { org } = await requireContext();

    // Load the document and verify it belongs to the caller's org
    const { data: document } = await admin
      .from("documents")
      .select("*, chatbots!inner(org_id)")
      .eq("id", id)
      .maybeSingle();
    const docOrgId = (
      document?.chatbots as unknown as { org_id: string } | undefined
    )?.org_id;
    if (!document || docOrgId !== org.id) {
      return jsonError("Document not found", 404);
    }
    if (document.status === "processing") {
      return jsonError("Document is already being processed", 409);
    }
    if (!document.file_path) {
      return jsonError("Document has no stored file", 400);
    }

    await admin
      .from("documents")
      .update({ status: "processing", error_message: null })
      .eq("id", id);

    // Download the original file from storage
    const { data: blob, error: downloadError } = await admin.storage
      .from("documents")
      .download(document.file_path);
    if (downloadError || !blob) {
      throw new Error(`Could not download file: ${downloadError?.message}`);
    }
    const buffer = Buffer.from(await blob.arrayBuffer());

    const ext =
      document.source_type === "text"
        ? "txt"
        : (getExtension(document.title) ?? "txt");
    const text = await extractText(buffer, ext);
    if (!text.trim()) {
      throw new Error("No text could be extracted from this document");
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("Document produced no chunks");

    const embeddings = await generateEmbeddings(chunks);

    // Replace any previous chunks (reprocess case)
    await admin.from("document_chunks").delete().eq("document_id", id);

    const rows = chunks.map((content, i) => ({
      document_id: id,
      content,
      embedding: JSON.stringify(embeddings[i]),
      chunk_index: i,
      metadata: { char_count: content.length },
    }));

    // Insert in batches to stay under request size limits
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await admin
        .from("document_chunks")
        .insert(rows.slice(i, i + BATCH));
      if (error) throw new Error(`Failed to store chunks: ${error.message}`);
    }

    const { data: updated, error: updateError } = await admin
      .from("documents")
      .update({ status: "processed", chunk_count: chunks.length })
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ document: updated });
  } catch (error) {
    if (documentId) {
      await admin
        .from("documents")
        .update({
          status: "failed",
          error_message:
            error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        })
        .eq("id", documentId);
    }
    return handleApiError(error);
  }
}

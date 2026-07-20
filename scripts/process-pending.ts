import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const { data: docs } = await admin
    .from("documents")
    .select("id, title, file_path, status")
    .neq("status", "processed");
  for (const doc of docs ?? []) {
    const { data: blob } = await admin.storage.from("documents").download(doc.file_path);
    if (!blob) { console.log(`${doc.title}: no file`); continue; }
    const text = (await blob.text()).trim();
    const res = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: text.slice(0, 8000),
      dimensions: 1536,
    });
    await admin.from("document_chunks").delete().eq("document_id", doc.id);
    await admin.from("document_chunks").insert({
      document_id: doc.id,
      content: text,
      embedding: JSON.stringify(res.data[0].embedding),
      chunk_index: 0,
      metadata: { char_count: text.length },
    });
    await admin.from("documents").update({ status: "processed", chunk_count: 1 }).eq("id", doc.id);
    console.log(`${doc.title}: processed`);
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });

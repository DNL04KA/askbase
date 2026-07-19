import { embedBatch } from "@/lib/ai";

export const SUPPORTED_EXTENSIONS = ["pdf", "txt", "md", "docx"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ~1000 tokens ≈ 4000 chars, ~200 token overlap ≈ 800 chars
const CHUNK_SIZE_CHARS = 4000;
const CHUNK_OVERLAP_CHARS = 800;

export function getExtension(filename: string): SupportedExtension | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension)
    ? (ext as SupportedExtension)
    : null;
}

export async function extractText(
  buffer: Buffer,
  extension: SupportedExtension
): Promise<string> {
  switch (extension) {
    case "pdf": {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        return result.text;
      } finally {
        await parser.destroy();
      }
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt":
    case "md":
      return buffer.toString("utf-8");
  }
}

/**
 * Splits text into overlapping chunks, preferring paragraph and sentence
 * boundaries so chunks stay semantically coherent.
 */
export function chunkText(
  text: string,
  size: number = CHUNK_SIZE_CHARS,
  overlap: number = CHUNK_OVERLAP_CHARS
): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    if (end < clean.length) {
      // Prefer to break on paragraph, then sentence, then word boundary.
      const window = clean.slice(start, end);
      const paragraphBreak = window.lastIndexOf("\n\n");
      const sentenceBreak = window.lastIndexOf(". ");
      const wordBreak = window.lastIndexOf(" ");

      if (paragraphBreak > size * 0.5) end = start + paragraphBreak;
      else if (sentenceBreak > size * 0.5) end = start + sentenceBreak + 1;
      else if (wordBreak > size * 0.5) end = start + wordBreak;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

/** Embeds chunks in batches of 100 (OpenAI embeddings API limit safety). */
export async function generateEmbeddings(
  chunks: string[]
): Promise<number[][]> {
  const BATCH = 100;
  const all: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    all.push(...(await embedBatch(batch)));
  }
  return all;
}

import OpenAI from "openai";

export const CHAT_MODEL = "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replaceAll("\n", " ").slice(0, 8000),
  });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.replaceAll("\n", " ").slice(0, 8000)),
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export interface RagSource {
  document_title: string;
  chunk_content_preview: string;
  similarity: number;
}

export function buildRagSystemPrompt(
  botSystemPrompt: string,
  contextChunks: { document_title: string; content: string }[]
): string {
  const context =
    contextChunks.length > 0
      ? contextChunks
          .map(
            (c, i) => `[Source ${i + 1}: ${c.document_title}]\n${c.content}`
          )
          .join("\n\n---\n\n")
      : "No relevant context found in the knowledge base.";

  return `${botSystemPrompt}

Use the following context from the knowledge base to answer the user's question. If the answer is not in the context, say you don't have that information — do not make things up. Answer in the language of the question. Format answers with Markdown when helpful.

CONTEXT:
${context}`;
}

/**
 * Seeds a demo user, organization, chatbot, and knowledge base documents.
 * Requires Supabase + OpenAI env vars in .env.local.
 * Run: npx tsx scripts/seed.ts
 */
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { config } from "dotenv";

config({ path: ".env.local" });

const DEMO_EMAIL = "demo@askbase.app";
const DEMO_PASSWORD = "demo1234";

const DOCS: { title: string; content: string }[] = [
  {
    title: "Acme Product FAQ.md",
    content: `# Acme Cloud — Frequently Asked Questions

## What is Acme Cloud?
Acme Cloud is a project management platform for small software teams. It combines task boards, docs, and time tracking in one workspace.

## How much does Acme Cloud cost?
Acme Cloud has three plans: Starter is free for up to 3 users. Team costs $12 per user per month. Enterprise pricing is custom — contact sales@acme.com.

## Is there a free trial?
Yes. Every paid plan starts with a 14-day free trial. No credit card is required to start a trial.

## What integrations are supported?
Acme Cloud integrates with Slack, GitHub, GitLab, Figma, and Google Calendar. Zapier support covers 3,000+ other tools.

## Can I import data from other tools?
Yes, we have one-click importers for Trello, Asana, and Jira. Imports preserve boards, tasks, comments, and attachments.`,
  },
  {
    title: "Refund and Billing Policy.md",
    content: `# Refund & Billing Policy

## Refunds
You can request a full refund within 30 days of any charge — no questions asked. Email support@acme.com with your order number and we will process it within 2 business days.

## Billing cycle
Subscriptions renew automatically on the same day each month. Annual plans renew yearly and include a 20% discount compared to monthly billing.

## Payment methods
We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. Enterprise customers can pay by invoice with NET-30 terms.

## Canceling
You can cancel anytime from Settings → Billing. After cancellation you keep access until the end of the paid period. We do not charge cancellation fees.

## Failed payments
If a payment fails we retry 3 times over 7 days and email you each time. After the final failed retry the account is downgraded to the free Starter plan — no data is deleted.`,
  },
  {
    title: "Getting Started Guide.md",
    content: `# Getting Started with Acme Cloud

## 1. Create your workspace
Sign up at acme.com/signup. Pick a workspace name — this is usually your company name. You can invite teammates immediately or later from Settings → Members.

## 2. Create your first project
Click "New Project" and choose a template: Kanban, Scrum, or Simple List. Templates can be customized at any time.

## 3. Invite your team
Go to Settings → Members and enter email addresses. Members can be Admins, Editors, or Viewers. Viewers are free on all plans.

## 4. Connect integrations
Open Settings → Integrations to connect Slack (for notifications) and GitHub (to link commits and PRs to tasks).

## 5. Track time (optional)
Enable time tracking per project in Project Settings. Reports are available under Analytics → Time.

## Support
Chat with us in-app (bottom-right bubble), email support@acme.com, or browse docs at docs.acme.com. Support replies within 4 hours on business days.`,
  },
];

function chunkText(text: string, size = 4000, overlap = 800): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl || !serviceKey || !openaiKey) {
    console.error(
      "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY."
    );
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  // 1. Demo user
  console.log("Creating demo user…");
  let userId: string;
  const { data: created, error: userError } = await admin.auth.admin.createUser(
    {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Demo User", org_name: "Acme Inc." },
    }
  );
  if (userError) {
    if (!userError.message.includes("already")) throw userError;
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === DEMO_EMAIL);
    if (!existing) throw new Error("Could not find existing demo user");
    userId = existing.id;
    console.log("  demo user already exists");
  } else {
    userId = created.user.id;
    console.log("  created", DEMO_EMAIL);
  }

  // 2. Organization
  let orgId: string;
  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (membership) {
    orgId = membership.org_id;
    console.log("  organization already exists");
  } else {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: "Acme Inc.", owner_id: userId })
      .select()
      .single();
    if (orgError) throw orgError;
    orgId = org.id;
    await admin
      .from("organization_members")
      .insert({ org_id: orgId, user_id: userId, role: "owner" });
    console.log("  created organization Acme Inc.");
  }

  // 3. Chatbot
  console.log("Creating demo chatbot…");
  let chatbotId: string;
  const { data: existingBot } = await admin
    .from("chatbots")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", "Acme Support Bot")
    .maybeSingle();
  if (existingBot) {
    chatbotId = existingBot.id;
    console.log("  chatbot already exists");
  } else {
    const { data: bot, error: botError } = await admin
      .from("chatbots")
      .insert({
        org_id: orgId,
        name: "Acme Support Bot",
        system_prompt:
          "You are Acme Cloud's friendly support assistant. Answer questions about the product, billing, and onboarding based on the provided context. Be concise and helpful.",
        welcome_message:
          "Hi! I'm the Acme support bot. Ask me about pricing, refunds, or getting started.",
      })
      .select()
      .single();
    if (botError) throw botError;
    chatbotId = bot.id;
    console.log("  created Acme Support Bot");
  }

  // 4. Documents + embeddings
  for (const doc of DOCS) {
    const { data: existingDoc } = await admin
      .from("documents")
      .select("id, status")
      .eq("chatbot_id", chatbotId)
      .eq("title", doc.title)
      .maybeSingle();
    if (existingDoc?.status === "processed") {
      console.log(`  "${doc.title}" already processed`);
      continue;
    }

    console.log(`Processing "${doc.title}"…`);
    const filePath = `${orgId}/${chatbotId}/${Date.now()}-${doc.title.replace(/\s+/g, "_")}`;
    await admin.storage
      .from("documents")
      .upload(filePath, new Blob([doc.content], { type: "text/markdown" }));

    const { data: docRow, error: docError } = await admin
      .from("documents")
      .insert({
        chatbot_id: chatbotId,
        title: doc.title,
        source_type: "file",
        file_path: filePath,
        status: "processing",
      })
      .select()
      .single();
    if (docError) throw docError;

    const chunks = chunkText(doc.content);
    const embeddings = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    });

    const rows = chunks.map((content, i) => ({
      document_id: docRow.id,
      content,
      embedding: JSON.stringify(embeddings.data[i].embedding),
      chunk_index: i,
      metadata: { char_count: content.length },
    }));
    const { error: chunkError } = await admin
      .from("document_chunks")
      .insert(rows);
    if (chunkError) throw chunkError;

    await admin
      .from("documents")
      .update({ status: "processed", chunk_count: chunks.length })
      .eq("id", docRow.id);
    console.log(`  ✓ ${chunks.length} chunks embedded`);
  }

  console.log("\nSeed complete!");
  console.log(`  Login:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

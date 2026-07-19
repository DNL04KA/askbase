# Askbase — Turn Your Docs Into an AI Chatbot

An MVP SaaS: upload company documents, get a RAG-powered AI chatbot available
as a ChatGPT-like interface in the dashboard **and** as an embeddable widget
for any website.

**Stack:** Next.js 16 (App Router) · Supabase (auth, Postgres + pgvector,
storage) · OpenAI (gpt-4o-mini + text-embedding-3-small) · Stripe (test mode,
with automatic mock fallback) · Tailwind CSS v4 + shadcn/ui.

## Features

- **Knowledge base ingestion** — PDF / DOCX / MD / TXT upload or pasted text;
  automatic extraction → chunking → embeddings → pgvector HNSW index.
- **Chat with sources** — streaming answers grounded in your documents, with
  per-answer source citations and similarity scores.
- **Embeddable widget** — one `<script>` tag adds a floating chat bubble to any
  site (color/position customizable, mobile fullscreen, visitor continuity).
- **Billing & plans** — Free / Pro $29 / Business $99 with enforced limits on
  chatbots, documents, and monthly messages. Stripe Checkout + Customer Portal
  + webhooks, or a fully mocked flow when Stripe keys are absent.
- **Multi-tenant** — organizations with RLS policies; every table is isolated
  per workspace.

> **Deploying?** Follow the step-by-step [DEPLOYMENT.md](DEPLOYMENT.md)
> checklist. Recording the demo? See [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole file
   [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
   (creates tables, RLS, pgvector index, `match_documents`, triggers, and the
   private `documents` storage bucket).
3. In **Authentication → Providers → Email**, disable *Confirm email* for the
   smoothest demo experience (optional — the app handles both modes).
4. Copy the project URL, anon key, and service-role key.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in Supabase keys and `OPENAI_API_KEY`.

#### Billing: mock-first, Stripe-ready

Billing is built around a provider abstraction (`lib/billing.ts`) so the
product UX is identical in both modes:

- **`BILLING_PROVIDER=mock` (default)** — checkout, plan switching,
  downgrade/cancel, and subscription records all work against the local DB.
  No Stripe account needed; the billing page shows a subtle "demo billing"
  note. This is the reliable mode for demos.
- **`BILLING_PROVIDER=stripe`** — real test-mode Stripe Checkout, Customer
  Portal, and webhook sync. Setup:
  ```bash
  npx tsx scripts/setup-stripe.ts        # creates products/prices
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  # put the whsec_… value into STRIPE_WEBHOOK_SECRET
  ```
  Use test card `4242 4242 4242 4242` at checkout. If Stripe keys are missing,
  the app automatically falls back to mock mode instead of crashing —
  switching to live billing later is an env change, not a redesign.

### 3. Run

```bash
npm install
npm run dev
```

### 4. Demo data (optional)

```bash
npx tsx scripts/seed.ts
```

Creates `demo@askbase.app` / `demo1234` with an "Acme Support Bot" trained on
three docs (FAQ, refund policy, onboarding guide). Ask it *"What's your refund
policy?"*.

## Embedding the widget

From a chatbot's **Embed** tab, copy:

```html
<script src="https://yourdomain.com/widget.js"
        data-token="EMBED_TOKEN"
        data-position="bottom-right"
        data-color="#7c5cff" async></script>
```

## Architecture notes

- `lib/chat-service.ts` — shared RAG pipeline (embed question → pgvector
  `match_documents` → system prompt with context → streamed completion via SSE)
  used by both the authenticated `/api/chat` and public `/api/widget/chat`.
- API routes verify session + org membership in code and use the service-role
  client; RLS remains as defense-in-depth for direct client access.
- Plan limits are enforced server-side in `lib/plan-limits.ts` on chatbot
  creation, document upload, and every message; usage is counted atomically via
  the `increment_message_usage` SQL function.
- Widget rate limiting: 50 messages/visitor/day (in-memory, best-effort) plus
  the org's monthly quota.

## Project structure

```
app/(marketing)/        landing page
app/(auth)/             login, signup
app/(dashboard)/        dashboard, chatbot tabs, settings, billing
app/widget/[token]/     standalone widget page (iframe content)
app/api/                chat, widget, documents, chatbots, billing, webhook
lib/                    supabase clients, RAG pipeline, plans, limits
public/widget.js        embeddable loader script
scripts/                setup-stripe.ts, seed.ts
supabase/migrations/    full SQL schema
```

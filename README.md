# Askbase — Turn Your Docs Into an AI Chatbot

Upload your company documents, get a RAG-powered AI chatbot: a ChatGPT-like
chat inside the app **and** an embeddable widget for any website. Built as a
production-shaped MVP — multi-tenant, plan-gated, with real Stripe billing.

**Repository:** [github.com/DNL04KA/askbase](https://github.com/DNL04KA/askbase)

> **Deploying?** Follow [DEPLOYMENT.md](DEPLOYMENT.md) step by step.
> Recording the demo? See [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).

---

## Features

- **Knowledge base ingestion** — PDF / DOCX / MD / TXT upload (drag & drop)
  or pasted text. Automatic pipeline: text extraction → overlapping chunking →
  embeddings → pgvector HNSW index. Click any document to **view its indexed
  content** chunk by chunk.
- **Chat with sources** — streaming answers grounded strictly in your
  documents, with per-answer source citations and similarity scores.
  Conversation history, Markdown rendering, anti-hallucination prompt.
- **Embeddable widget** — one `<script>` tag adds a floating chat bubble to
  any site. Custom color/position, mobile fullscreen, visitor continuity,
  token-scoped public API with rate limiting.
- **Billing & plans** — Free / Pro $29 / Business $99. Real **Stripe
  Checkout + Customer Portal** (test mode) with webhook sync **and**
  sync-on-return (works even without webhooks). Falls back to a fully
  functional mock mode when Stripe keys are absent.
- **Plan limits enforced server-side** — chatbots, documents, and monthly
  messages are checked in the API on every operation (verified: the 6th
  document on Free returns `403 Document limit reached`).
- **Multi-tenant security** — organizations with Postgres RLS on every table;
  the widget never exposes tables directly.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`) |
| Data / Auth / Vectors | Supabase (Postgres + pgvector, RLS, Storage, Auth) |
| AI | Any OpenAI-compatible API — OpenAI or **Google Gemini** (default config), with automatic model fallback on overload |
| Billing | Stripe (test mode) with provider abstraction (`mock` ⇄ `stripe`) |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI), Vercel Analytics |

## Quick start

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run the whole
   [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
   (tables, RLS, pgvector index, `match_documents`, triggers, storage bucket).
3. Authentication → Sign In / Up → Email → disable *Confirm email*.
4. Copy the Project URL, `anon` key, and `service_role` key.

### 2. Environment

```bash
cp .env.example .env.local
```

Required: the three Supabase keys and an AI key. Two supported AI setups:

**Google Gemini (free tier, no card):**
```env
OPENAI_API_KEY=<key from aistudio.google.com>
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
CHAT_MODEL=gemini-3.5-flash
EMBEDDING_MODEL=gemini-embedding-001
```

**OpenAI:** just set `OPENAI_API_KEY=sk-…` and leave the rest unset.

If the primary chat model is overloaded (429/503), the app automatically
retries with fallback models — configurable via `CHAT_MODEL_FALLBACKS`.

### 3. Billing (choose one)

- **`BILLING_PROVIDER=stripe`** — real test-mode checkout:
  ```bash
  npx tsx scripts/setup-stripe.ts   # creates Pro/Business products & prices
  ```
  Set `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Test card:
  `4242 4242 4242 4242`. Webhooks are optional locally — the billing page
  syncs the subscription from Stripe on load (`syncFromStripe`). For
  production add a webhook endpoint `/api/stripe/webhook` and set
  `STRIPE_WEBHOOK_SECRET`.
- **`BILLING_PROVIDER=mock`** — no Stripe account needed; upgrades/cancels
  are simulated in the DB with a "demo billing" note in the UI.

The app never crashes on missing Stripe env — it falls back to mock.

### 4. Run & seed

```bash
npm install
npm run dev
npx tsx scripts/seed.ts   # demo account with a trained chatbot
```

| Account | Login | Password | What's inside |
|---|---|---|---|
| Demo (Pro) | `demo@askbase.app` | `demo1234` | "Acme Support Bot" trained on 3 docs — ask *"What's your refund policy?"* |
| Free-plan tester | `free.tester@askbase.app` | `tester1234` | Fresh Free workspace at its limits (1/1 bots, 5/5 docs) |

Utility: `npx tsx scripts/process-pending.ts` re-processes any documents
stuck in `pending` (e.g. after an API outage).

## Embedding the widget

From a chatbot's **Embed** tab copy:

```html
<script src="https://yourdomain.com/widget.js"
        data-token="EMBED_TOKEN"
        data-position="bottom-right"
        data-color="#7c5cff" async></script>
```

Free plan shows a "Powered by Askbase" watermark; paid plans remove it.

## Architecture notes

- `lib/chat-service.ts` — shared RAG pipeline (embed question → pgvector
  `match_documents` → grounded system prompt → streamed SSE completion with
  model fallback) used by both the authenticated `/api/chat` and the public
  `/api/widget/chat`.
- `lib/billing.ts` — billing provider abstraction: `createCheckoutSession`,
  `createCustomerPortalSession`, `getCurrentSubscription`, `changePlanMock`,
  `syncSubscriptionState`, `syncFromStripe`. UI and gating never talk to
  Stripe directly, so switching providers is an env change.
- `lib/plan-limits.ts` — server-side limit checks backed by DB counts; usage
  is incremented atomically via the `increment_message_usage` SQL function.
- API routes verify session + org membership, then use the service-role
  client; RLS stays on as defense-in-depth.
- Embeddings are requested at 1536 dimensions with Matryoshka truncation
  fallback, so any provider fits the `vector(1536)` schema.

## Project structure

```
app/(marketing)/        landing page
app/(auth)/             login, signup
app/(dashboard)/        chatbots, tabs (Chat/Documents/Settings/Embed), billing
app/widget/[token]/     public widget page (iframe content)
app/api/                chat, widget, documents, chatbots, billing, webhook
lib/                    supabase clients, RAG, billing, plans, limits
public/widget.js        embeddable loader script
scripts/                setup-stripe, seed, process-pending
supabase/migrations/    full SQL schema (run once in Supabase)
```

## Known MVP trade-offs

- Landing's Annual −20% toggle is marketing-only; checkout is monthly.
- Widget per-visitor rate limit is in-memory (resets on cold starts); the
  org's monthly quota in the DB is the real backstop.
- Document processing runs synchronously in the API route (fine up to ~2 min
  per file); a background queue would be the production upgrade.

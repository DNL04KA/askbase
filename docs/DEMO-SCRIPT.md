# Demo video script (~3.5 min)

Record screen + voice, in English. One take per section — easier to stitch
than re-recording everything. Read each paragraph aloud once before recording
to smooth out the wording.

**Before recording:**
- Production site is live: `https://askbase-rho.vercel.app`
- Deployment Protection is OFF (open the site in incognito to confirm it loads
  without a Vercel login).
- Logged in as `demo@askbase.app` / `demo1234` (Acme Support Bot, 3 docs).
- Have a second browser tab with a plain external HTML page that has the embed
  `<script>` in it (the "money shot" in section 5).

---

## 0:00 — Landing (30s)

*Screen: homepage, slow scroll down to pricing.*

> "This is Askbase — a tool that turns your company documents into an AI
> chatbot. You upload your knowledge base, and you get a chatbot that answers
> with sources — both inside the app and as a widget you can embed on any
> website. There are three plans: Free to try, Pro at 29 dollars, and Business
> at 99 — each with limits on chatbots, documents, and monthly messages."

## 0:30 — Signup & first chatbot (30s)

*Screen: /signup → create account → empty dashboard → New chatbot.*

> "Signup asks for a workspace name — every user gets their own organization,
> and all data is isolated per workspace with row-level security in Postgres.
> Here's my empty dashboard, and I'll create my first chatbot — a support
> assistant."

## 1:00 — Uploading documents (40s)

*Screen: Documents tab → drag-drop a file → status pending → processed →
click the document title to open the content viewer.*

> "Now the knowledge. I drag in a document — it's stored in a private bucket,
> the text is extracted, split into overlapping chunks, and each chunk is
> embedded and indexed in pgvector for semantic search. You can also paste raw
> text. A few seconds later it's processed. I can click any document to see
> exactly what got indexed. And plans cap how many documents you can have —
> five on Free, fifty on Pro — enforced on the server."

## 1:40 — Chat with sources (40s)

*Screen: Chat tab → ask "What's your refund policy?" → streaming answer →
expand Sources.*

> "The chat works like ChatGPT, with streaming answers — but every reply is
> grounded in my documents. The question is embedded, we run a vector
> similarity search, and the model only answers from the retrieved context.
> Under each answer you can open the exact sources, with similarity scores.
> If the answer isn't in the docs, it says so instead of making something up."

## 2:20 — Embeddable widget (40s) — the key moment

*Screen: Embed tab → Copy embed code → switch to the external site tab →
click the chat bubble → ask a question.*

> "And here's the main feature. One script tag — no code, no framework needed.
> I've already pasted it into a completely separate website. The chat bubble
> appears, and a visitor can ask questions answered from my knowledge base,
> right here on another site. On the Free plan there's a 'Powered by Askbase'
> watermark; paid plans remove it. The endpoint is public but scoped to the
> embed token and rate-limited per visitor."

## 3:00 — Billing (25s)

*Screen: /dashboard/billing → usage bars → Upgrade to Pro → real Stripe
Checkout → test card 4242 4242 4242 4242 → back in the app, plan is now Pro.*

> "Billing is real Stripe in test mode. Here's usage against my plan limits.
> When I upgrade, it opens a real Stripe Checkout — I'll pay with a test card —
> and back in the app my plan is now Pro and the limits went up. It's built on
> a provider abstraction, so it also runs in a mock mode with no Stripe account
> at all."

## 3:25 — Close (10s)

*Screen: back to the landing hero.*

> "So — upload your docs, get an AI chatbot, embed it anywhere. Built with
> Next.js 16, Supabase, pgvector, Gemini, and Stripe. Thanks for watching."

---

## Handy facts if asked / for on-screen typing

- Prod URL: `https://askbase-rho.vercel.app`
- Demo login: `demo@askbase.app` / `demo1234`
- Free-plan account (shows limits hit): `free.tester@askbase.app` / `tester1234`
- Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.
- Repo: `github.com/DNL04KA/askbase`

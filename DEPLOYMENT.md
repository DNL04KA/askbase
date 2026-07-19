# Deployment checklist

Follow top to bottom — ~30 minutes to a live, working product.

## 1. Supabase (once, ~10 min)

- [ ] Create a project at [supabase.com](https://supabase.com) (free tier is fine).
- [ ] **SQL Editor** → paste the entire
      [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) → Run.
      Should end with "Success". This creates all tables, RLS, pgvector,
      `match_documents`, triggers, and the private `documents` bucket.
- [ ] **Authentication → Sign In / Up → Email** → turn **off** "Confirm email"
      (smoother demo; the app also handles the confirm-on flow).
- [ ] **Project Settings → API** → copy: Project URL, `anon` key, `service_role` key.

## 2. Local smoke test (~10 min)

- [ ] Fill `askbase/.env.local`:
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.
- [ ] `npm run dev`, then `npx tsx scripts/seed.ts`
      → creates `demo@askbase.app` / `demo1234` with a bot trained on 3 docs.
- [ ] Log in as the demo user and verify the golden path:
  - [ ] Chat tab → ask *"What's your refund policy?"* → streamed answer
        with a **Sources** block underneath.
  - [ ] Documents tab → drag-drop any PDF → status goes
        pending → processing → processed with a chunk count.
  - [ ] Embed tab → live widget preview answers messages.
  - [ ] Billing → Upgrade to Pro → plan badge in the sidebar changes,
        limits on the billing page update (demo billing, no charge).

## 3. Vercel (~10 min)

- [ ] Push the repo to GitHub, import into Vercel (defaults are fine — Next 16).
- [ ] Environment variables — same four keys as `.env.local`, **plus**:
      - `SITE_URL` = `https://<your-app>.vercel.app`
      - `NEXT_PUBLIC_APP_URL` = `https://<your-app>.vercel.app`
      - `BILLING_PROVIDER` = `mock`
- [ ] Deploy, open the production URL, repeat the golden path once.

## 4. The money shot — widget on a foreign site

- [ ] Take any external page (a plain HTML file on GitHub Pages / Netlify /
      even a local file) and add before `</body>`:
      ```html
      <script src="https://<your-app>.vercel.app/widget.js"
              data-token="<embed token from the Embed tab>" async></script>
      ```
- [ ] The chat bubble appears and answers from your knowledge base.
      This is the single most impressive moment for the demo video.

## 5. Optional: real Stripe test mode

Only if you want real Checkout in the demo (mock mode already covers the
assignment):

- [ ] Set `BILLING_PROVIDER=stripe`, `STRIPE_SECRET_KEY`,
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test keys).
- [ ] `npx tsx scripts/setup-stripe.ts` (creates products/prices).
- [ ] Add a webhook endpoint in the Stripe dashboard →
      `https://<your-app>.vercel.app/api/stripe/webhook`
      (events: `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`) → put the signing secret into
      `STRIPE_WEBHOOK_SECRET`.
- [ ] Test card: `4242 4242 4242 4242`, any future date, any CVC.

## Known trade-offs (fine for an MVP, worth knowing)

- The Monthly/Annual toggle on the landing page is marketing-only; mock
  checkout always creates a monthly period.
- Widget rate limiting (50 msg/visitor/day) is in-memory — resets on
  serverless cold starts. The org-level monthly quota is enforced in the DB
  and is the real backstop.
- Document processing runs synchronously in the API route (max ~2 min) —
  fine for typical docs; a queue would be the production upgrade.

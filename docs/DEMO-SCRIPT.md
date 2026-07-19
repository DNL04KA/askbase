# Demo video script (~3.5 min)

Записывай экран + голос. Один дубль на секцию — склеить проще, чем
перезаписывать всё. Перед записью: выполнен seed, вход под
`demo@askbase.app`, открыты вкладки: лендинг, дашборд, внешний сайт с
виджетом.

---

## 0:00 — Лендинг (30 сек)

*Экран: главная, медленный скролл до прайсинга.*

> "This is Askbase — a SaaS that turns your company docs into an AI chatbot.
> You upload your knowledge base, and you get a chatbot that answers with
> sources — inside the app and as a widget you can embed on any website.
> Three plans: Free to try, Pro at $29, Business at $99 — with limits on
> chatbots, documents and monthly messages."

## 0:30 — Signup и первый бот (30 сек)

*Экран: /signup → создание аккаунта → пустой дашборд → New chatbot.*

> "Sign-up asks for your workspace name — every user gets an organization,
> and all data is isolated per workspace with row-level security. This is my
> first chatbot — I'll call it Support Assistant."

## 1:00 — Загрузка документов (40 сек)

*Экран: таб Documents → drag-drop PDF → статусы pending → processed.*

> "Now the knowledge. I drag in a PDF — it's uploaded to private storage,
> the text is extracted, split into overlapping chunks, and each chunk is
> embedded with OpenAI and indexed in pgvector. You can also paste raw text.
> A few seconds later — processed, 12 chunks. Plans limit how many documents
> you can have: five on Free, fifty on Pro."

## 1:40 — Чат с источниками (40 сек)

*Экран: таб Chat → вопрос "What's your refund policy?" → стриминг → раскрыть Sources.*

> "The chat works like ChatGPT — streaming answers — but every reply is
> grounded in my documents. The question is embedded, we run a vector
> similarity search, and the model answers only from the retrieved context.
> Under each answer — the exact sources with similarity scores. If the answer
> isn't in the docs, it says so instead of making things up."

## 2:20 — Embed-виджет (40 сек) — ключевой момент

*Экран: таб Embed → Copy embed code → переключиться на внешний сайт →
кликнуть бабл → задать вопрос.*

> "And here's the main feature. One script tag — no code, no framework.
> I've pasted it into a completely separate website... the chat bubble
> appears, and visitors ask questions answered from my knowledge base.
> On the Free plan there's a 'Powered by Askbase' watermark — paid plans
> remove it. The widget is public but token-scoped and rate-limited."

## 3:00 — Биллинг (25 сек)

*Экран: /dashboard/billing → usage-бары → Upgrade to Pro → бейдж сменился.*

> "Billing: current usage against plan limits, and a full upgrade flow.
> It runs on a provider abstraction — today in demo mode, and switching to
> live Stripe is a single environment variable, the architecture is already
> there: checkout, customer portal, webhooks."

## 3:25 — Финал (10 сек)

*Экран: обратно на лендинг, hero.*

> "Askbase — upload your docs, get an AI chatbot, embed it anywhere.
> Built with Next.js 16, Supabase, pgvector and OpenAI. Thanks for watching."

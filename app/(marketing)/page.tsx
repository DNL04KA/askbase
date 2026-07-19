import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Code2,
  FileText,
  Palette,
  Quote,
  ScanSearch,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingHeader } from "@/components/marketing/header";
import { HeroChatDemo } from "@/components/marketing/hero-chat-demo";
import { PricingSection } from "@/components/marketing/pricing-section";
import { UseCases } from "@/components/marketing/use-cases";
import { Reveal } from "@/components/marketing/reveal";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "RAG-powered answers",
    description:
      "Every reply is grounded in your actual documents via vector search — not generic model knowledge.",
  },
  {
    icon: Code2,
    title: "Embeddable widget",
    description:
      "One script tag adds a chat bubble to any website. No framework, no build step, no code changes.",
  },
  {
    icon: Quote,
    title: "Cited sources",
    description:
      "Each answer shows which documents it came from, with similarity scores you can inspect.",
  },
  {
    icon: FileText,
    title: "Multi-format support",
    description:
      "PDF, DOCX, Markdown, plain text — or just paste content straight into the dashboard.",
  },
  {
    icon: Palette,
    title: "Custom branding",
    description:
      "Match your brand color and position. Pro plans remove the watermark entirely.",
  },
  {
    icon: BarChart3,
    title: "Usage analytics",
    description:
      "Track conversations and message volume per month, right from your billing page.",
  },
];

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload your docs",
    description:
      "Drag in PDFs, Word files, or Markdown. We extract, chunk, and index the content automatically.",
  },
  {
    icon: Bot,
    title: "AI learns from them",
    description:
      "Your content becomes a searchable knowledge base. Ask a question — get a grounded, cited answer.",
  },
  {
    icon: Code2,
    title: "Embed on your site",
    description:
      "Copy one script tag. A chat bubble appears on your website and starts answering your visitors.",
  },
];

const FAQ_ITEMS = [
  {
    q: "How does it work?",
    a: "Askbase uses retrieval-augmented generation (RAG). When you upload documents, we split them into chunks and index them with vector embeddings. When someone asks a question, we retrieve the most relevant chunks and pass them to the AI model, so answers are grounded in your content — with sources attached.",
  },
  {
    q: "What documents are supported?",
    a: "PDF, DOCX, Markdown, and plain text files up to 10 MB each. You can also paste text directly. Website crawling is on our roadmap.",
  },
  {
    q: "Can I customize the widget?",
    a: "Yes — set the accent color and screen position from the dashboard or via data attributes on the embed script. Pro and Business plans remove the Askbase watermark.",
  },
  {
    q: "Is my data secure?",
    a: "Your documents are stored in a private bucket, isolated per workspace with row-level security. Document content is only used to answer questions for your own chatbots — never to train models.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Subscriptions are monthly and you can cancel with one click from the billing page. Your bots keep working on the Free plan limits.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Askbase",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Turn your company docs into a RAG-powered AI chatbot and embed it on your website.",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
    { "@type": "Offer", price: "29", priceCurrency: "USD", name: "Pro" },
    { "@type": "Offer", price: "99", priceCurrency: "USD", name: "Business" },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -top-64 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/14 blur-[140px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <div className="animate-rise mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Set up in 5 minutes — no code required
          </div>
          <h1 className="animate-rise mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Turn Your Docs Into an{" "}
            <span className="gradient-text">AI Chatbot</span>
          </h1>
          <p
            className="animate-rise mx-auto mt-5 max-w-xl text-lg text-muted-foreground"
            style={{ animationDelay: "100ms" }}
          >
            Upload your company knowledge, get a chatbot that answers with
            RAG-powered accuracy — in your app and on your website.
          </p>
          <div
            className="animate-rise mt-8 flex justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <Button size="lg" render={<Link href="/signup" />}>
                Get started free
                <ArrowRight className="size-4" />
              </Button>
            <Button size="lg" variant="outline" render={<a href="#how-it-works" />}>See how it works</Button>
          </div>
          <div
            className="animate-rise mt-14"
            style={{ animationDelay: "260ms" }}
          >
            <HeroChatDemo />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            From documents to answers in three steps
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
              <div className="relative h-full rounded-2xl border border-border/60 bg-card/60 p-6">
                <span className="absolute top-6 right-6 text-4xl font-semibold text-border">
                  {i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <step.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Focused on one job: accurate answers from your docs, anywhere.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 80}>
              <div className="group h-full rounded-2xl border border-border/60 bg-card/60 p-6 transition-colors hover:border-primary/40">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary transition-transform group-hover:scale-110">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Built for teams that answer questions
          </h2>
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <UseCases />
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Start free. Upgrade when your traffic grows.
          </p>
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <PricingSection />
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-2xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <Accordion className="mt-8">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger className="text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Reveal>
          <div className="glow relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 px-6 py-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.62_0.21_288/18%),transparent_60%)]"
            />
            <h2 className="relative text-3xl font-semibold tracking-tight">
              Start building your chatbot today
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
              Free plan includes a full chatbot with 5 documents and the
              embeddable widget. No credit card required.
            </p>
            <Button size="lg" className="relative mt-7" render={<Link href="/signup" />}>
                Create your chatbot
                <ArrowRight className="size-4" />
              </Button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Bot className="size-3.5" />
            </span>
            Askbase
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Askbase. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

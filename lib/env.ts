import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  // "mock" (default) simulates checkout/subscriptions in the DB.
  // "stripe" enables the real Stripe codepaths (requires the keys below).
  BILLING_PROVIDER: z.enum(["mock", "stripe"]).default("mock"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validates env vars on first server-side access. Throws a readable error
 * listing every missing variable instead of failing deep inside a request.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    ...process.env,
    SITE_URL: process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env.local and fill in the values.`
    );
  }
  cached = parsed.data;
  return cached;
}

export type BillingProvider = "mock" | "stripe";

/**
 * Effective billing provider. Falls back to mock when BILLING_PROVIDER=stripe
 * but the secret key is missing, so the app never crashes on absent Stripe env.
 */
export function getBillingProvider(): BillingProvider {
  const requested = process.env.BILLING_PROVIDER;
  if (requested === "stripe" && process.env.STRIPE_SECRET_KEY) return "stripe";
  if (requested === "stripe") {
    console.warn(
      "BILLING_PROVIDER=stripe but STRIPE_SECRET_KEY is missing — falling back to mock billing"
    );
  }
  return "mock";
}

export function isStripeConfigured(): boolean {
  return getBillingProvider() === "stripe";
}

export function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // On Vercel, fall back to the deployment's own domain automatically
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily initialized Stripe client. Callers must check isStripeConfigured() first. */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set — billing runs in mock mode"
      );
    }
    client = new Stripe(key);
  }
  return client;
}

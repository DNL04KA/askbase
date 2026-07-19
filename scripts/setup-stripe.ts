/**
 * Creates Stripe products and prices for Askbase plans (test mode).
 * Run: npx tsx scripts/setup-stripe.ts
 */
import Stripe from "stripe";
import { config } from "dotenv";

config({ path: ".env.local" });

const PLANS = [
  { name: "Askbase Pro", lookupKey: "askbase_pro_monthly", amount: 2900 },
  {
    name: "Askbase Business",
    lookupKey: "askbase_business_monthly",
    amount: 9900,
  },
];

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.log(
      "Billing runs in mock mode (no STRIPE_SECRET_KEY set) — nothing to do.\n" +
        "Add test-mode Stripe keys to .env.local and set BILLING_PROVIDER=stripe to enable real checkout."
    );
    return;
  }
  const stripe = new Stripe(key);

  for (const plan of PLANS) {
    const existing = await stripe.prices.list({
      lookup_keys: [plan.lookupKey],
      limit: 1,
    });
    if (existing.data.length > 0) {
      console.log(`✓ Price ${plan.lookupKey} already exists, skipping`);
      continue;
    }

    const product = await stripe.products.create({ name: plan.name });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "usd",
      recurring: { interval: "month" },
      lookup_key: plan.lookupKey,
    });
    console.log(`✓ Created ${plan.name}: ${price.id} (${plan.lookupKey})`);
  }

  console.log("\nDone. Set STRIPE_WEBHOOK_SECRET after running:");
  console.log("  stripe listen --forward-to localhost:3000/api/stripe/webhook");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

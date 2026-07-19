export type PlanId = "free" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  /** Stripe lookup key for the monthly price (set by scripts/setup-stripe.ts). */
  stripeLookupKey: string | null;
  limits: {
    chatbots: number;
    documents: number;
    messagesPerMonth: number;
  };
  features: string[];
  watermark: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    stripeLookupKey: null,
    limits: { chatbots: 1, documents: 5, messagesPerMonth: 100 },
    features: [
      "1 chatbot",
      "5 documents",
      "100 messages / month",
      "Embeddable widget",
      '"Powered by Askbase" watermark',
    ],
    watermark: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    stripeLookupKey: "askbase_pro_monthly",
    limits: { chatbots: 5, documents: 50, messagesPerMonth: 5000 },
    features: [
      "5 chatbots",
      "50 documents",
      "5,000 messages / month",
      "No watermark",
      "Widget customization",
      "Priority support",
    ],
    watermark: false,
  },
  business: {
    id: "business",
    name: "Business",
    priceMonthly: 99,
    stripeLookupKey: "askbase_business_monthly",
    limits: { chatbots: 20, documents: 200, messagesPerMonth: 25000 },
    features: [
      "20 chatbots",
      "200 documents",
      "25,000 messages / month",
      "White-label widget",
      "API access",
      "Team members",
    ],
    watermark: false,
  },
};

export function getPlan(planId: string | null | undefined): Plan {
  if (planId === "pro" || planId === "business") return PLANS[planId];
  return PLANS.free;
}

export const ANNUAL_DISCOUNT = 0.2;

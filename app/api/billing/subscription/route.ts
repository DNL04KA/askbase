import { NextResponse } from "next/server";
import { requireContext } from "@/lib/org";
import { getCurrentSubscription } from "@/lib/billing";
import { handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const { org } = await requireContext();
    const subscription = await getCurrentSubscription(org);
    return NextResponse.json({
      plan: subscription.plan.id,
      status: subscription.status,
      provider: subscription.provider,
      current_period_end: subscription.currentPeriodEnd,
      limits: subscription.plan.limits,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

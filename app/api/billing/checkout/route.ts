import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext } from "@/lib/org";
import { createCheckoutSession } from "@/lib/billing";
import { handleApiError, jsonError } from "@/lib/api-utils";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "business"]),
});

export async function POST(request: Request) {
  try {
    const { user, org } = await requireContext();
    const body = checkoutSchema.safeParse(await request.json());
    if (!body.success) return jsonError("Invalid plan", 400);

    const redirect = await createCheckoutSession(
      org,
      user.email ?? undefined,
      body.data.plan
    );
    return NextResponse.json(redirect);
  } catch (error) {
    return handleApiError(error);
  }
}

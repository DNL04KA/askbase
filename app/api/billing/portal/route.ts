import { NextResponse } from "next/server";
import { requireContext } from "@/lib/org";
import { createCustomerPortalSession } from "@/lib/billing";
import { handleApiError } from "@/lib/api-utils";

export async function POST() {
  try {
    const { org } = await requireContext();
    const redirect = await createCustomerPortalSession(org);
    return NextResponse.json(redirect);
  } catch (error) {
    return handleApiError(error);
  }
}

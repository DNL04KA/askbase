import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError, jsonError } from "@/lib/api-utils";

const settingsSchema = z.object({
  org_name: z.string().min(1).max(80).optional(),
  full_name: z.string().min(1).max(80).optional(),
});

export async function PATCH(request: Request) {
  try {
    const { user, org } = await requireContext();
    const body = settingsSchema.safeParse(await request.json());
    if (!body.success) return jsonError("Invalid request body", 400);

    const admin = createAdminClient();

    if (body.data.org_name) {
      const { error } = await admin
        .from("organizations")
        .update({ name: body.data.org_name })
        .eq("id", org.id);
      if (error) throw new Error(error.message);
    }

    if (body.data.full_name) {
      const { error } = await admin
        .from("profiles")
        .update({ full_name: body.data.full_name })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

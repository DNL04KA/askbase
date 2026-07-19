import { NextResponse } from "next/server";

/** Maps thrown errors (including status-tagged ones from lib/org) to JSON responses. */
export function handleApiError(error: unknown): NextResponse {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status: number }).status
      : 500;
  const message = error instanceof Error ? error.message : "Internal error";
  if (status >= 500) console.error("API error:", error);
  return NextResponse.json({ error: message }, { status });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const configuredModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
  const validModel = /^[a-zA-Z0-9.-]{1,80}$/.test(configuredModel);
  const configured = Boolean(apiKey && validModel);

  return NextResponse.json({
    configured,
    provider: configured ? "gemini" : "rules",
    model: configured ? configuredModel : null,
    demoData: true,
    externalActionsEnabled: false
  }, { headers: { "Cache-Control": "no-store" } });
}

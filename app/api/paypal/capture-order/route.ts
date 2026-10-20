import { NextResponse } from "next/server";
import { getPayPalAccessToken, isSameOriginRequest, paypalApiUrl, paypalConfigured } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured. Add server-side credentials first." }, { status: 503 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "This payment action must be initiated from the AgentFlow site." }, { status: 403 });
  }

  let body: { orderId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON body." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!/^[A-Za-z0-9-]{5,80}$/.test(orderId)) {
    return NextResponse.json({ error: "A valid PayPal orderId is required." }, { status: 400 });
  }

  try {
    const token = await getPayPalAccessToken();
    const response = await fetch(paypalApiUrl(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: "{}",
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: "PayPal could not capture this order.", details: data?.message || "Provider request failed." }, { status: 502 });
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      purchase_units: data.purchase_units,
      sandbox: process.env.PAYPAL_ENVIRONMENT !== "live"
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to capture PayPal order." }, { status: 502 });
  }
}

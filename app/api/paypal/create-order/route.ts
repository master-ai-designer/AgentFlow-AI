import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getPayPalAccessToken, paypalApiUrl, paypalConfigured } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({
      error: "PayPal Sandbox is not configured yet.",
      setup: "Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_ENVIRONMENT=sandbox in your server environment."
    }, { status: 503 });
  }

  let body: { amount?: unknown; currency?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON body." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "USD";

  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000 || !/^([A-Z]{3})$/.test(currency)) {
    return NextResponse.json({ error: "Amount must be greater than 0 and no more than 10000; currency must be a 3-letter code." }, { status: 400 });
  }

  try {
    const token = await getPayPalAccessToken();
    const origin = new URL(request.url).origin;
    const response = await fetch(paypalApiUrl("/v2/checkout/orders"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "PayPal-Request-Id": randomUUID()
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: "agentflow-sandbox-demo",
          description: "AgentFlow AI Sandbox test checkout",
          amount: { currency_code: currency, value: amount.toFixed(2) }
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "AgentFlow AI",
              user_action: "PAY_NOW",
              return_url: `${origin}/payments/return`,
              cancel_url: `${origin}/payments/cancel`
            }
          }
        }
      }),
      cache: "no-store"
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: "PayPal could not create the order.", details: data?.message || "Provider request failed." }, { status: 502 });
    }

    return NextResponse.json({ id: data.id, status: data.status, links: data.links, sandbox: process.env.PAYPAL_ENVIRONMENT !== "live" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create PayPal order." }, { status: 502 });
  }
}

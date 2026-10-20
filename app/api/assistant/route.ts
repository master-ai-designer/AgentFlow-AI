import { NextResponse } from "next/server";

type AssistantRequest = { message?: string; orders?: Array<{ id?: string; customer?: string; amount?: number; status?: string }> };

export async function POST(request: Request) {
  let body: AssistantRequest;
  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return NextResponse.json({ error: "Please send a valid JSON request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1500) : "";
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const orders = Array.isArray(body.orders) ? body.orders.slice(0, 500) : [];
  const normalized = message.toLowerCase();
  let answer: string;

  if (normalized.includes("pending") || normalized.includes("payment")) {
    const pending = orders.filter((order) => (order.status || "").toLowerCase() === "pending");
    answer = pending.length
      ? `I found ${pending.length} order(s) marked pending: ${pending.slice(0, 10).map((order) => `${order.id || "Order"} (${order.customer || "customer"}, $${Number(order.amount || 0).toFixed(2)})`).join("; ")}. Please verify payment status with your payment provider before fulfilling an order.`
      : "No pending orders were included in the data sent to me. If no order data was supplied, connect your order source first.";
  } else if (normalized.includes("summar") || normalized.includes("today") || normalized.includes("sales")) {
    const paid = orders.filter((order) => (order.status || "").toLowerCase() === "paid");
    const total = paid.reduce((sum, order) => sum + (Number.isFinite(Number(order.amount)) ? Number(order.amount) : 0), 0);
    answer = `From the order data provided: ${orders.length} order(s), ${paid.length} marked paid, and $${total.toFixed(2)} in paid order value. This is only as current as the data supplied by the app.`;
  } else if (normalized.includes("follow") || normalized.includes("email") || normalized.includes("customer")) {
    answer = "Suggested customer follow-up: “Hi! We're checking in about your order. If you have any questions or need help, just reply to this message and we'll be happy to assist.” This is a draft only; nothing has been sent.";
  } else if (normalized.includes("refund")) {
    answer = "Before issuing a refund, verify the captured payment with PayPal, confirm the amount and reason, and obtain the required approval. This assistant does not issue refunds.";
  } else {
    answer = "I can summarize the order data you provide, find orders marked pending, draft customer follow-ups, and outline safe payment workflows. Live store data and AI-provider integration are not configured by this endpoint yet.";
  }

  return NextResponse.json({ answer, mode: "rules", externalActionTaken: false });
}

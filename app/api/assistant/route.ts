import { NextResponse } from "next/server";

type OrderInput = { id: string; customer: string; amount: number; status: string; date?: string };
type AssistantRequest = { message?: unknown; orders?: unknown };

const MAX_MESSAGE_LENGTH = 1500;
const MAX_ORDERS = 500;
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);

function isOrder(value: unknown): value is OrderInput {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return typeof order.id === "string" && order.id.length <= 100 &&
    typeof order.customer === "string" && order.customer.length <= 150 &&
    typeof order.amount === "number" && Number.isFinite(order.amount) && order.amount >= 0 && order.amount <= 1_000_000 &&
    typeof order.status === "string" && order.status.length <= 40 &&
    (order.date === undefined || (typeof order.date === "string" && order.date.length <= 40));
}

export async function POST(request: Request) {
  let body: AssistantRequest;
  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return NextResponse.json({ error: "Please send a valid JSON request." }, { status: 400 });
  }

  if (typeof body.message !== "string") {
    return NextResponse.json({ error: "Message must be a string." }, { status: 400 });
  }
  const message = body.message.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  let orders: OrderInput[] = [];
  if (body.orders !== undefined) {
    if (!Array.isArray(body.orders) || body.orders.length > MAX_ORDERS || !body.orders.every(isOrder)) {
      return NextResponse.json({ error: `Orders must be an array of at most ${MAX_ORDERS} valid order records.` }, { status: 400 });
    }
    orders = body.orders;
  }

  const text = message.toLowerCase();
  const paid = orders.filter((order) => order.status.toLowerCase() === "paid");
  const pending = orders.filter((order) => order.status.toLowerCase() === "pending");
  const paidValue = paid.reduce((sum, order) => sum + order.amount, 0);
  let answer: string;

  if (/\b(refund|chargeback|dispute)\b/.test(text)) {
    answer = "Refund safety checklist: verify the captured PayPal payment and currency, confirm the customer and reason, check your refund policy, and obtain the required approval. This prototype does not issue refunds or contact customers.";
  } else if (/\b(pending|unpaid|awaiting payment|payment due)\b/.test(text)) {
    answer = orders.length
      ? pending.length
        ? `I found ${pending.length} demo order(s) marked pending: ${pending.slice(0, 10).map((order) => `${order.id} — ${order.customer}, ${money(order.amount)}`).join("; ")}${pending.length > 10 ? "; and more" : ""}. A pending label is not proof of provider status; verify in PayPal before fulfilling.`
        : "No supplied demo orders are marked Pending. This only reflects the records sent by the dashboard; it does not query PayPal."
      : "No order records were supplied, so I cannot identify pending payments. Connect or provide order data first.";
  } else if (/\b(summar|snapshot|sales|revenue|total orders|how many orders|today)\b/.test(text)) {
    answer = orders.length
      ? `Demo order snapshot: ${orders.length} order(s), ${paid.length} marked Paid, ${pending.length} marked Pending, and ${money(paidValue)} in order value for records marked Paid. The dashboard data is sample/in-memory data, not live analytics; no date-range comparison is available.`
      : "No order records were supplied, so I cannot calculate a summary. Connect or provide order data first.";
  } else if (/\b(follow.?up|draft|email|message to|contact customer|customer message)\b/.test(text)) {
    answer = "Customer follow-up draft (not sent): “Hi! We’re checking in about your order. If you have any questions or need help, just reply to this message and we’ll be happy to assist.” Add the correct customer name and order details before sending.";
  } else if (/\b(help|what can you do|capabilit|commands)\b/.test(text)) {
    answer = "I can summarize the supplied demo orders, find records marked Pending, draft customer follow-ups, and outline safer refund workflows. I cannot access a live store, verify PayPal status, send messages, issue refunds, or perform external actions in this prototype.";
  } else {
    answer = "I’m currently a rule-based demo assistant, not a connected large language model. Try: “Summarize orders”, “Find pending payments”, “Draft a customer follow-up”, or “What should I check before a refund?” No external action has been taken.";
  }

  return NextResponse.json({ answer, mode: "rules", externalActionTaken: false, demoData: true });
}

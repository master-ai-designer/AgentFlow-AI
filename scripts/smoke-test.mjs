import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const baseUrl = "http://127.0.0.1:3000";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"], {
  stdio: "inherit",
  env: { ...process.env, PORT: "3000", GEMINI_API_KEY: "" }
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next.js server exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Next.js server did not become ready within 30 seconds.");
}

try {
  await waitForServer();
  console.log("PASS: homepage returns HTTP 200");

  const assistantResponse = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Summarize orders",
      orders: [{ id: "AF-TEST", customer: "Test Customer", amount: 25, status: "Paid" }]
    })
  });
  assert.equal(assistantResponse.status, 200, "assistant API should accept valid demo input");
  const assistantData = await assistantResponse.json();
  assert.equal(assistantData.mode, "rules", "smoke test should use the no-key rule fallback");
  assert.match(assistantData.answer, /1 order/i, "assistant summary should use supplied order data");
  assert.equal(assistantData.externalActionTaken, false, "assistant must not claim external actions");
  console.log("PASS: assistant API validates and summarizes supplied demo orders");

  const invalidResponse = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: " " })
  });
  assert.equal(invalidResponse.status, 400, "blank assistant message should be rejected");
  console.log("PASS: assistant API rejects blank messages");

  const invalidOrderResponse = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Summarize", orders: [{ id: {}, amount: "bad", status: 42 }] })
  });
  assert.equal(invalidOrderResponse.status, 400, "malformed order data should be rejected");
  console.log("PASS: assistant API rejects malformed order data");

  for (const [path, body] of [
    ["/api/paypal/create-order", { amount: 10, currency: "USD" }],
    ["/api/paypal/capture-order", { orderId: "SANDBOX-ORDER-123" }]
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    assert.equal(response.status, 503, `${path} should stay disabled when Sandbox credentials are absent`);
  }
  console.log("PASS: PayPal routes fail closed when credentials are absent");
} catch (error) {
  console.error("SMOKE TEST FAILED:", error);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}

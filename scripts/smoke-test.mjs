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
  const homepage = await fetch(baseUrl);
  assert.equal(homepage.status, 200, "homepage should return HTTP 200");
  assert.equal(homepage.headers.get("x-content-type-options"), "nosniff", "security headers should be present");
  assert.equal(homepage.headers.get("x-frame-options"), "DENY", "framing should be blocked");
  console.log("PASS: homepage returns HTTP 200 with baseline security headers");

  for (const path of ["/payments/return", "/payments/cancel"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} should render`);
  }
  console.log("PASS: PayPal return and cancellation pages render");

  const assistantStatusResponse = await fetch(baseUrl + "/api/assistant/status");
  assert.equal(assistantStatusResponse.status, 200, "assistant status endpoint should return HTTP 200");
  const assistantStatus = await assistantStatusResponse.json();
  assert.equal(assistantStatus.configured, false, "smoke test should not require an external Gemini key");
  assert.equal(assistantStatus.provider, "rules", "unconfigured assistant should report rules mode");
  assert.equal("apiKey" in assistantStatus, false, "assistant status must never expose API keys");
  console.log("PASS: assistant status is available without exposing secrets");

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

  const oversizedMessageResponse = await fetch(baseUrl + "/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(1501) })
  });
  assert.equal(oversizedMessageResponse.status, 400, "oversized assistant messages should be rejected");
  console.log("PASS: assistant API rejects oversized messages");

  const invalidOrderResponse = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Summarize", orders: [{ id: {}, amount: "bad", status: 42 }] })
  });
  assert.equal(invalidOrderResponse.status, 400, "malformed order data should be rejected");
  console.log("PASS: assistant API rejects malformed order data");

  let rateLimited = false;
  for (let attempt = 0; attempt < 13; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "help" })
    });
    if (response.status === 429) rateLimited = true;
  }
  assert.equal(rateLimited, true, "assistant API should throttle repeated requests within one server instance");
  console.log("PASS: assistant API applies its per-instance request limit");

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

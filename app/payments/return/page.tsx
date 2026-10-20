"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleHelp, LoaderCircle, ShieldCheck } from "lucide-react";

type ResultState = "checking" | "success" | "error";

export default function PayPalReturnPage() {
  const [state, setState] = useState<ResultState>("checking");
  const [message, setMessage] = useState("Verifying the PayPal Sandbox transaction…");

  useEffect(() => {
    let active = true;
    const orderId = new URLSearchParams(window.location.search).get("token");
    if (!orderId) {
      setState("error");
      setMessage("PayPal did not return an order token. No payment status could be verified.");
      return () => { active = false; };
    }

    fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "PayPal Sandbox capture failed.");
      if (data.status !== "COMPLETED" || data.sandbox !== true) {
        throw new Error("The provider did not confirm a completed Sandbox payment.");
      }
      if (active) {
        setState("success");
        setMessage(`Sandbox payment ${data.id || orderId} was completed. This is a test transaction, not a real-money payment.`);
      }
    }).catch((error: unknown) => {
      if (active) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not verify the Sandbox transaction.");
      }
    });

    return () => { active = false; };
  }, []);

  return (
    <main className="payment-result-shell">
      <section className="payment-result-card" aria-live="polite">
        <div className={`payment-result-icon ${state}`}>
          {state === "checking" ? <LoaderCircle size={28} /> : state === "success" ? <CheckCircle2 size={28} /> : <CircleHelp size={28} />}
        </div>
        <p className="payment-result-eyebrow"><ShieldCheck size={14} /> AGENTFLOW AI · PAYPAL SANDBOX</p>
        <h1>{state === "checking" ? "Verifying test payment" : state === "success" ? "Sandbox payment completed" : "Payment not confirmed"}</h1>
        <p className="payment-result-message">{message}</p>
        <a className="primary-button payment-result-link" href="/">Return to AgentFlow</a>
        <p className="payment-result-note">Sandbox only. This page does not confirm or represent any live-money payment.</p>
      </section>
    </main>
  );
}

import { CircleX, ShieldCheck } from "lucide-react";

export default function PayPalCancelPage() {
  return (
    <main className="payment-result-shell">
      <section className="payment-result-card">
        <div className="payment-result-icon error"><CircleX size={28} /></div>
        <p className="payment-result-eyebrow"><ShieldCheck size={14} /> AGENTFLOW AI · PAYPAL SANDBOX</p>
        <h1>Sandbox checkout cancelled</h1>
        <p className="payment-result-message">The test checkout was cancelled. No successful capture was reported by this page.</p>
        <a className="primary-button payment-result-link" href="/">Return to AgentFlow</a>
        <p className="payment-result-note">Sandbox only. No live-money payment was attempted.</p>
      </section>
    </main>
  );
}

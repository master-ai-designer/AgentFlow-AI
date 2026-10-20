# AgentFlow AI

**An AI-powered business operations workspace for orders, customers, and safer payment workflows.**

AgentFlow AI is a standalone hackathon project. It is completely separate from TastePilot AI.

## What's in the current MVP

- Responsive business dashboard with order overview and status filters
- Create-order modal for temporary demo orders
- Searchable sample order list
- Assistant panel connected to a server-side rule-based API, with a local demo fallback
- API endpoint for summarizing supplied order data, finding pending payments, and drafting customer follow-ups
- PayPal Sandbox server routes for creating and capturing checkout orders
- Server-only credential handling; no PayPal secret is bundled into client-side code
- Clear demo-mode messaging so sample figures are not mistaken for real store analytics

## Important status and safety notes

- Orders in the dashboard are sample data saved in the current browser's local storage; they are not stored in a database or shared between devices.
- The assistant uses a server-side Gemini model when GEMINI_API_KEY is configured; without it, it falls back to deterministic rules.
- The PayPal endpoints are not yet wired to a checkout button in the dashboard.
- PayPal integration requires your own Sandbox REST app credentials.
- Gemini integration is optional and uses a server-side GEMINI_API_KEY; without the key, the rule-based fallback remains available.
- **This prototype intentionally blocks live PayPal mode.** Before any real-money use, add authentication, verify order ownership, persistent storage, rate limiting, audit logging, error monitoring, tests, and a security review.
- Never paste real credentials into GitHub or expose PAYPAL_CLIENT_SECRET to browser code.

## Run locally

Requirements: Node.js 18.17 or later.

1. Copy .env.example to .env.local.
2. Create a REST app in the PayPal Developer Dashboard's Sandbox environment.
3. Put the Sandbox client ID and secret into .env.local.
4. Optionally add GEMINI_API_KEY from Google AI Studio to enable the LLM assistant; set GEMINI_MODEL only if you want to override the default.
5. Keep PAYPAL_ENVIRONMENT=sandbox.
6. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

If credentials are missing, the dashboard still runs in demo mode and the PayPal endpoints return a configuration message.

## API endpoints

### POST /api/assistant

Example body:

```json
{
  "message": "Find pending payments",
  "orders": [
    { "id": "AF-2046", "customer": "Lana Steiner", "amount": 136, "status": "Pending" }
  ]
}
```

Returns a rule-based response. It does not send messages or perform external actions.

### POST /api/paypal/create-order

Example body: {"amount": 25.00, "currency": "USD"}

Creates a PayPal Sandbox checkout order and returns its ID and approval links.

### POST /api/paypal/capture-order

Example body: {"orderId": "PAYPAL_SANDBOX_ORDER_ID"}

Captures a Sandbox order. Only use IDs from your own Sandbox test flow. Authentication and order ownership checks must be added before exposing payment actions to real users.

## Tech stack

- Next.js App Router
- React and TypeScript
- Lucide icons
- Custom responsive CSS
- PayPal REST API (Sandbox endpoints only)

## Next milestones

1. Add tests and run a production build.
2. Connect the PayPal approval flow to the UI and verify it end to end in Sandbox.
3. Add database-backed orders and an audit trail.
4. Add authenticated, permission-aware AI actions with explicit user confirmation.
5. Deploy to Vercel and prepare the hackathon demo walkthrough.

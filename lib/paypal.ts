const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";

// This MVP intentionally supports Sandbox only. Do not switch to live payments
// until authentication, order ownership, audit logging, and production review exist.
export function paypalConfigured() {
  return process.env.PAYPAL_ENVIRONMENT !== "live" &&
    Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (process.env.PAYPAL_ENVIRONMENT === "live") {
    throw new Error("Live PayPal payments are disabled in this prototype. Use Sandbox only.");
  }
  if (!clientId || !clientSecret) {
    throw new Error("PayPal Sandbox is not configured. Add server-side credentials to the deployment environment.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PayPal Sandbox authentication failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal did not return an access token.");
  return data.access_token;
}

export function paypalApiUrl(path: string) {
  return `${PAYPAL_BASE_URL}${path}`;
}

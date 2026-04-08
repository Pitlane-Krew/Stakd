import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

/**
 * Verify webhook signature from Stripe
 */
export function verifyWebhookSignature(body: string, signature: string): object {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    throw new Error(
      `Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get price ID from environment
 */
export function getPriceId(tier: "pro" | "elite", billing: "monthly" | "annual"): string {
  const key = billing === "monthly"
    ? tier === "pro"
      ? "STRIPE_PRICE_PRO_MONTHLY"
      : "STRIPE_PRICE_ELITE_MONTHLY"
    : tier === "pro"
    ? "STRIPE_PRICE_PRO_ANNUAL"
    : "STRIPE_PRICE_ELITE_ANNUAL";

  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`${key} environment variable is not set`);
  }
  return priceId;
}

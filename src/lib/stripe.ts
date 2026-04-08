import Stripe from "stripe";

/**
 * Stripe client — initialized lazily so the app can build and run
 * even when Stripe env vars are not yet configured.
 * Stripe is deferred until paid launch; calls will fail gracefully
 * with a clear error if someone hits a payment route before setup.
 */
let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "Stripe is not configured yet. Set STRIPE_SECRET_KEY to enable payments."
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripeClient() — kept for backward compat */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Verify webhook signature from Stripe
 */
export function verifyWebhookSignature(body: string, signature: string): object {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  try {
    return getStripeClient().webhooks.constructEvent(
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

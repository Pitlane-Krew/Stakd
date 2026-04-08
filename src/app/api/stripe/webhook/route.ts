import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyWebhookSignature, stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature) as Stripe.Event;

    // Create service role client for database updates
    const supabase = createServiceRoleClient();

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, supabase);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase);
        break;
      }

      default:
        // Silently ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 to prevent Stripe from retrying
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 200 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier as "pro" | "elite" | undefined;

  if (!userId || !tier) {
    console.warn("Missing userId or tier in checkout session metadata");
    return;
  }

  // Get subscription ID from session
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.warn("Missing subscription ID in checkout session");
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Calculate expiration date (start of next billing period)
  const expiresAt = new Date((subscription.current_period_end || 0) * 1000).toISOString();

  // Update profile with tier and subscription info
  const { error } = await supabase
    .from("profiles")
    .update({
      tier,
      tier_expires_at: expiresAt,
      stripe_subscription_id: subscriptionId,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update profile after checkout:", error);
    throw error;
  }
}

/**
 * Handle subscription updated (e.g., plan change)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const userId = (subscription.metadata?.user_id) as string | undefined;

  if (!userId) {
    console.warn("Missing userId in subscription metadata");
    return;
  }

  // Get the current price to determine tier
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.warn("No price found in subscription");
    return;
  }

  // Map price ID to tier (you'd need to match against your env vars)
  const tier = await determineTierFromPriceId(priceId);
  if (!tier) {
    console.warn("Could not determine tier from price ID:", priceId);
    return;
  }

  const expiresAt = new Date((subscription.current_period_end || 0) * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      tier,
      tier_expires_at: expiresAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update subscription:", error);
    throw error;
  }
}

/**
 * Handle subscription cancellation (downgrade to free)
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const userId = subscription.metadata?.user_id as string | undefined;

  if (!userId) {
    console.warn("Missing userId in subscription metadata");
    return;
  }

  // Downgrade to free tier
  const { error } = await supabase
    .from("profiles")
    .update({
      tier: "free",
      tier_expires_at: null,
      stripe_subscription_id: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to downgrade profile:", error);
    throw error;
  }
}

/**
 * Handle payment failures
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const customerId = invoice.customer as string | undefined;

  if (!customerId) {
    console.warn("Missing customer ID in invoice");
    return;
  }

  // Retrieve customer to get user ID
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.user_id as string | undefined;

  if (!userId) {
    console.warn("Could not determine userId from customer");
    return;
  }

  // Log the payment failure (you might send an email notification here)
  console.warn(`Payment failed for user ${userId}, invoice ${invoice.id}`);

  // Note: Stripe will attempt automatic recovery and eventually cancel the subscription
  // if the payment fails, which will trigger the subscription.deleted event
}

/**
 * Determine tier from price ID by matching environment variables
 */
async function determineTierFromPriceId(priceId: string): Promise<"pro" | "elite" | null> {
  const tiers: Record<string, "pro" | "elite"> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: "pro",
    [process.env.STRIPE_PRICE_PRO_ANNUAL || ""]: "pro",
    [process.env.STRIPE_PRICE_ELITE_MONTHLY || ""]: "elite",
    [process.env.STRIPE_PRICE_ELITE_ANNUAL || ""]: "elite",
  };

  return tiers[priceId] || null;
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyWebhookSignature, stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

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

    // Verify webhook signature — return 400 on failure so Stripe retries
    try {
      event = verifyWebhookSignature(body, signature) as Stripe.Event;
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Webhook body parsing error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  // Create service role client for database updates
  const supabase = await createServiceRoleClient();

  try {
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

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice, supabase);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialEnding(subscription, supabase);
        break;
      }

      default:
        // Silently ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Processing error — return 500 so Stripe retries
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
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

  // Attach user_id metadata to subscription for future webhook events
  if (!subscription.metadata?.user_id) {
    await stripe.subscriptions.update(subscriptionId, {
      metadata: { user_id: userId, tier },
    });
  }

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

  // Log the event
  await supabase.from("audit_logs").insert({
    actor_id: userId,
    actor_role: "system",
    action: `subscription.created.${tier}`,
    target_type: "subscription",
    target_id: subscriptionId,
    metadata: { tier, billing: subscription.items.data[0]?.price.recurring?.interval },
  }).then(() => {});
}

/**
 * Handle subscription updated (e.g., plan change)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
) {
  const userId = subscription.metadata?.user_id as string | undefined;

  if (!userId) {
    // Try to look up user by customer ID
    const customerId = subscription.customer as string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!profile) {
      console.warn("Could not find user for subscription update");
      return;
    }

    return handleSubscriptionUpdateForUser(profile.id, subscription, supabase);
  }

  return handleSubscriptionUpdateForUser(userId, subscription, supabase);
}

async function handleSubscriptionUpdateForUser(
  userId: string,
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
) {
  // Get the current price to determine tier
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.warn("No price found in subscription");
    return;
  }

  const tier = determineTierFromPriceId(priceId);
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
  supabase: SupabaseClient
) {
  let userId = subscription.metadata?.user_id as string | undefined;

  if (!userId) {
    const customerId = subscription.customer as string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!profile) {
      console.warn("Could not find user for subscription deletion");
      return;
    }
    userId = profile.id;
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

  // Log the event
  await supabase.from("audit_logs").insert({
    actor_id: userId,
    actor_role: "system",
    action: "subscription.cancelled",
    target_type: "subscription",
    target_id: subscription.id,
  }).then(() => {});
}

/**
 * Handle payment failures
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
) {
  const customerId = invoice.customer as string | undefined;
  if (!customerId) return;

  // Look up user by customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.warn("Could not find user for failed payment");
    return;
  }

  // Create notification for the user
  await supabase.from("notifications").insert({
    user_id: profile.id,
    type: "payment_failed",
    title: "Payment Failed",
    body: "Your subscription payment could not be processed. Please update your payment method to avoid losing access.",
    entity_type: "subscription",
  });

  console.warn(`Payment failed for user ${profile.id}, invoice ${invoice.id}`);
}

/**
 * Handle successful payment (renewal)
 */
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient
) {
  // Only handle subscription invoices, not one-off
  if (!invoice.subscription) return;

  const customerId = invoice.customer as string | undefined;
  if (!customerId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) return;

  // Create positive notification
  await supabase.from("notifications").insert({
    user_id: profile.id,
    type: "payment_succeeded",
    title: "Payment Successful",
    body: "Your subscription has been renewed successfully.",
    entity_type: "subscription",
  });
}

/**
 * Handle trial ending soon (3 days before)
 */
async function handleTrialEnding(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
) {
  const userId = subscription.metadata?.user_id as string | undefined;
  if (!userId) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "trial_ending",
    title: "Trial Ending Soon",
    body: "Your trial ends in 3 days. Add a payment method to keep your features.",
    entity_type: "subscription",
  });
}

/**
 * Determine tier from price ID by matching environment variables
 */
function determineTierFromPriceId(priceId: string): "pro" | "elite" | null {
  const tiers: Record<string, "pro" | "elite"> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: "pro",
    [process.env.STRIPE_PRICE_PRO_ANNUAL || ""]: "pro",
    [process.env.STRIPE_PRICE_ELITE_MONTHLY || ""]: "elite",
    [process.env.STRIPE_PRICE_ELITE_ANNUAL || ""]: "elite",
  };

  return tiers[priceId] || null;
}

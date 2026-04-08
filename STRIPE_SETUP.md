# Stripe Billing Integration Setup Guide

This document outlines the complete Stripe billing integration for STAKD, including subscriptions, webhooks, and tier management.

## Overview

The integration provides:
- **Subscription Management**: Monthly and annual plans (Pro, Elite)
- **Webhook Handling**: Automatic tier updates on subscription changes
- **Customer Portal**: Stripe-hosted management for changing payment methods and cancellations
- **Tier Enforcement**: Automatic downgrade to free on cancellation

## Updated Pricing Structure

- **Free/Starter**: $0/mo (unchanged)
- **Pro**: $5.99/mo or $49.99/yr (28% annual discount)
- **Elite**: $9.99/mo or $89.99/yr (25% annual discount)

## Environment Variables

Add these to your `.env.local`:

```env
# Stripe API keys
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)

# Price IDs (created in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ELITE_MONTHLY=price_...
STRIPE_PRICE_ELITE_ANNUAL=price_...
```

## Getting Stripe Credentials

### 1. Create Stripe Account
- Go to [stripe.com](https://stripe.com)
- Create a free account

### 2. Get API Keys
- Navigate to Developers > API Keys in the Stripe Dashboard
- Copy the Secret Key (starts with `sk_test_` or `sk_live_`)
- Copy the Publishable Key (starts with `pk_test_` or `pk_live_`)

### 3. Create Price Objects
In the Stripe Dashboard:

1. Go to **Products** > **Add product**
2. Create "STAKD Pro" product with:
   - Price: $5.99 (monthly) - note the Price ID
   - Price: $49.99 (annually) - note the Price ID
3. Create "STAKD Elite" product with:
   - Price: $9.99 (monthly) - note the Price ID
   - Price: $89.99 (annually) - note the Price ID

Set `STRIPE_PRICE_*` env vars with these IDs.

### 4. Set Up Webhook
1. Go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the Signing secret and set `STRIPE_WEBHOOK_SECRET`

For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the signing secret that appears
```

## Files Created/Modified

### New Files

1. **`src/lib/stripe.ts`** - Stripe client initialization and helpers
   - Initializes Stripe SDK
   - Exports webhook verification function
   - Exports price ID resolution function

2. **`src/app/api/stripe/checkout/route.ts`** - Checkout session creation
   - Requires authentication
   - Creates/retrieves Stripe customer
   - Creates Stripe Checkout Session
   - Returns redirect URL to Stripe Checkout

3. **`src/app/api/stripe/webhook/route.ts`** - Webhook event handler
   - Verifies webhook signature
   - Handles subscription lifecycle events:
     - `checkout.session.completed` → Update tier on successful purchase
     - `customer.subscription.updated` → Sync tier changes
     - `customer.subscription.deleted` → Downgrade to free
     - `invoice.payment_failed` → Log failed payments

4. **`src/app/api/stripe/portal/route.ts`** - Customer Portal session
   - Requires authentication
   - Creates Stripe Billing Portal Session
   - Allows customers to manage subscriptions, payment methods, and invoices

5. **`supabase/migrations/023_stripe_customers.sql`** - Database schema
   - Adds `stripe_customer_id` column to profiles
   - Adds `stripe_subscription_id` column to profiles
   - Creates indexes for efficient lookups

### Modified Files

1. **`src/config/tiers.ts`**
   - Updated Pro: $7.99/mo → $5.99/mo, $69.99/yr → $49.99/yr
   - Updated Elite: $14.99/mo → $9.99/mo, $129.99/yr → $89.99/yr

2. **`src/types/database.ts`**
   - Added `stripe_customer_id` to Profile Row and Update types
   - Added `stripe_subscription_id` to Profile Row and Update types

3. **`src/app/(main)/pricing/page.tsx`**
   - Wired "Upgrade" buttons to call `/api/stripe/checkout`
   - Added "Manage Subscription" button for current subscribers
   - Shows loading states during checkout
   - Displays success/cancelled alerts after Stripe redirects
   - Updated annual discount percentage to 28%

4. **`package.json`**
   - Added `stripe` dependency (^16.4.0)

## Database Migration

Run the migration to add Stripe columns:

```bash
npx supabase migration up
```

Or manually in Supabase Dashboard:
```sql
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT UNIQUE;
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
```

## Subscription Flow

### Upgrade Flow
1. User clicks "Upgrade to Pro/Elite" on pricing page
2. Frontend calls `/api/stripe/checkout` with tier and annual flag
3. Backend:
   - Authenticates user
   - Creates/retrieves Stripe customer
   - Creates checkout session
   - Returns Stripe Checkout URL
4. Frontend redirects to Stripe Checkout
5. User enters payment details
6. Stripe redirects to success URL with session ID
7. Webhook fires `checkout.session.completed`
8. Backend:
   - Retrieves subscription details
   - Updates `profiles` table with tier and expiration date
   - Stores `stripe_subscription_id`

### Manage Subscription
1. Subscriber clicks "Manage Subscription"
2. Frontend calls `/api/stripe/portal`
3. Backend creates Billing Portal session
4. Frontend redirects to Stripe Billing Portal
5. User can:
   - Update payment method
   - View/download invoices
   - Change billing frequency (monthly to annual, etc.)
   - Cancel subscription

### Cancellation Flow
1. User cancels in Billing Portal
2. Stripe processes cancellation (end of current period)
3. Webhook fires `customer.subscription.deleted` at end of period
4. Backend downgrades user to free tier
5. Sets `tier_expires_at` to null

### Payment Failure
1. Subscription payment fails
2. Webhook fires `invoice.payment_failed`
3. Stripe attempts automatic recovery (3 attempts over 3 days)
4. If recovery fails, subscription is cancelled
5. `customer.subscription.deleted` webhook fires, downgrading to free

## Testing in Development

### Using Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Run tests
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

### Test Cards
Stripe provides test card numbers:
- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **Amex**: `3782 822463 10005`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

### Manual Testing
1. Set env vars with test keys
2. Run dev server: `npm run dev`
3. Go to pricing page
4. Click "Upgrade to Pro" (annual)
5. Use test card `4242 4242 4242 4242`
6. Complete checkout
7. Verify profile updated in Supabase with tier=pro

## Error Handling

The implementation includes error handling for:
- Missing authentication
- Invalid tier selection
- Stripe customer creation failures
- Checkout session creation failures
- Webhook signature verification failures
- Database update failures

All errors are logged to console and returned with appropriate HTTP status codes.

## Security Considerations

1. **Webhook Signature Verification**: All webhooks are verified using Stripe's signing secret
2. **Raw Body Parsing**: Webhook route uses raw body (not JSON) for signature verification
3. **Service Role**: Webhook uses service role client for database updates (bypasses RLS)
4. **User Authentication**: Checkout and portal routes require user authentication
5. **Environment Variables**: All sensitive keys stored in env vars, never hardcoded

## Production Checklist

Before going live:
- [ ] Switch to live Stripe API keys
- [ ] Update webhook endpoint URL to production domain
- [ ] Create live price objects in Stripe Dashboard
- [ ] Update `STRIPE_PRICE_*` env vars with live price IDs
- [ ] Test full checkout flow with real payment method
- [ ] Test webhook events (use Stripe Dashboard event logs)
- [ ] Set up email notifications for payment failures
- [ ] Configure Stripe tax settings if applicable
- [ ] Enable Stripe Radar for fraud detection
- [ ] Set up Stripe billing notifications and email templates
- [ ] Review Stripe dashboard settings (logo, branding, receipt templates)

## Troubleshooting

### Webhook Not Firing
1. Check webhook endpoint in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` matches webhook endpoint secret
3. Check endpoint response (should return 200)
4. Use Stripe CLI: `stripe logs tail`

### Checkout Fails
1. Verify `STRIPE_PRICE_*` env vars are correct price IDs
2. Check Stripe Dashboard for product/price status
3. Verify user is authenticated
4. Check server logs for error details

### Tier Not Updating
1. Verify webhook received event (check Stripe Dashboard events)
2. Check database for `stripe_subscription_id` in profiles
3. Verify `tier_expires_at` is being set correctly
4. Check if Supabase RLS policies block service role updates

### Payment Declined
1. Use valid test card from Stripe documentation
2. Check for payment intent metadata mismatches
3. Review Stripe Dashboard for error details

## Further Reading

- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Billing Guide](https://stripe.com/docs/billing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Checkout](https://stripe.com/docs/checkout)

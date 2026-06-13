# Stripe Connect Live Mode Cutover Guide

This document outlines the required steps to safely transition Verihub's invoice payments to live mode, enabling actual destination charges and payouts.

## 1. Context & Architecture

Verihub uses **Stripe Connect Express** for invoice payments.
- **Invoice Payments**: Are currently in **test mode** (`INVOICE_PAYMENTS_STRIPE_MODE=test`).
- **Pro Subscriptions**: Are currently in **live mode** (`STRIPE_SECRET_KEY` is a live key).

These two domains are isolated. Modifying the invoice keys and webhooks will NOT affect Pro subscriptions, as long as the primary `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` are not changed.

## 2. Environment Variable Updates

When you are ready to process live invoice payments, you must update the environment variables to use your live platform credentials for the Connect integration.

1. Locate your **live** platform keys in the Stripe Dashboard.
2. Update the `.env` file (or your hosting provider's environment variables):

```env
# Change from test to live
INVOICE_PAYMENTS_STRIPE_MODE=live

# Ensure these match your LIVE Stripe platform keys
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

*Note: The `STRIPE_SECRET_KEY` should already be a live key for Pro subscriptions. `getInvoiceStripeInstance()` dynamically uses this same live key if `INVOICE_PAYMENTS_STRIPE_MODE=live`.*

## 3. Webhook Configuration

Invoice webhooks (Connect events) must be configured in your **Live Stripe Dashboard**.

1. Go to the **Stripe Dashboard** (Live mode).
2. Navigate to **Developers > Webhooks**.
3. Click **Add an endpoint**.
4. Set the Endpoint URL to your live domain: `https://verihub.app/api/stripe/webhook`
5. **CRITICAL STEP**: Click **Listen to events on Connected accounts** (this is usually a toggle or separate tab in the webhook creation flow).
6. Select the `account.updated` event.
7. Click **Add endpoint**.

## 4. Webhook Secrets

The webhook route (`src/app/api/stripe/webhook/route.ts`) is designed with a fallback mechanism:
- It tries to verify the payload using `STRIPE_WEBHOOK_SECRET` (live secret) first.
- If it fails, it falls back to `STRIPE_TEST_WEBHOOK_SECRET` (test secret).

**Important:** 
You must update your `.env` to include the new live webhook secret you generated in Step 3. Since the Pro subscription already uses `STRIPE_WEBHOOK_SECRET`, and Stripe generates a *new* secret for each webhook endpoint, you have two choices:
- Option A: Add the `account.updated` event to your *existing* live webhook endpoint in the Stripe Dashboard (if it supports listening to Connected accounts on the same endpoint).
- Option B (Recommended): If Stripe requires a separate webhook endpoint for Connect events, add a new environment variable (e.g., `STRIPE_CONNECT_WEBHOOK_SECRET`) and update `src/app/api/stripe/webhook/route.ts` to check this third secret in its fallback chain.

Currently, the code falls back gracefully, so if you use the existing live webhook endpoint (Option A) and just add the `account.updated` event to it, no code changes are needed!

## 5. Verification Checklist

Before announcing the feature:
- [ ] Ensure `INVOICE_PAYMENTS_STRIPE_MODE=live`.
- [ ] Create a live test invoice.
- [ ] Verify you can onboard a live Connect Express account (you will need a real SSN/EIN).
- [ ] Verify the `account.updated` webhook correctly sets your `connectOnboardingStatus` to `COMPLETE` in the database.
- [ ] Enable online payments on an invoice and complete a live checkout with a real credit card.
- [ ] Check the destination account's Stripe dashboard to verify the funds were correctly routed (Destination Charge).

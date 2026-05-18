# Verihub Production Readiness & Deployment Checklist

This document serves as the final pre-flight checklist before launching Verihub to real users in a production environment.

## 1. Environment Variables
Ensure all production environments (Vercel, etc.) have the following critical variables securely configured:

**Required:**
- `DATABASE_URL` (Neon or Postgres equivalent)
- `NEXT_PUBLIC_APP_URL` (e.g., `https://verihub.app`)
- `NEXTAUTH_SECRET` (or `AUTH_SECRET`)
- `STRIPE_SECRET_KEY` (Live mode key)
- `STRIPE_WEBHOOK_SECRET` (Live mode webhook signing secret)
- `INTERNAL_JOB_SECRET` (or `CRON_SECRET` for Vercel Cron)
- `VERIHUB_EMAIL_FROM` (e.g., `Verihub <verihub@tektriq.com>`)

**Optional but Recommended:**
- `SENTRY_DSN` (For error tracking)

## 2. Stripe Configuration
- [ ] Ensure the Stripe Webhook endpoint (`/api/stripe/webhook`) is added to the live Stripe Dashboard.
- [ ] Select the required events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- [ ] Copy the live signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Verify that Stripe Hosted Checkout branding matches Verihub styling.

## 3. Database Validation
- [ ] Run `npx prisma db push` or `npx prisma migrate deploy` on the production database.
- [ ] Verify that all Phase 9 indexes are applied for performance (Invoice, CustomerContact, StripeWebhookEvent, InternalJobRun).
- [ ] Enable automated daily backups in your DB provider (e.g., Neon).

## 4. Cron Jobs
- [ ] Configure `vercel.json` (or Vercel dashboard) to trigger `/api/internal/cron/payment-reminders` daily.
- [ ] Configure `vercel.json` to trigger `/api/internal/cron/invoice-aging-digest` weekly (e.g., Monday 8 AM).
- [ ] Verify `INTERNAL_JOB_SECRET` matches the `Authorization: Bearer <secret>` header in the cron caller.

## 5. Security & Rate Limiting
- [ ] The in-memory rate limiter protects public payment portals, checkout session creation, and campaign execution.
- [ ] **Rollback Plan:** If a bad deploy breaks payments, revert to the previous successful Vercel deployment instantly via the Vercel Dashboard.

## 6. Smoke Testing (Pre-Launch)
Perform the following manual tests on a staging environment using Stripe Test Mode before flipping to live keys:
1. [ ] Create a user account and upgrade to Pro (or mock admin).
2. [ ] Create a Draft Invoice and mark it Sent.
3. [ ] Open the Public Invoice Portal and verify the layout.
4. [ ] Initiate a Stripe Test Checkout and complete payment.
5. [ ] Verify Webhook receives event, marks Invoice as PAID, and logs the `StripeWebhookEvent` id to prevent replays.
6. [ ] Verify the Receipt is auto-generated.
7. [ ] Test the CSV export to ensure formulas (e.g., `=SUM()`) are correctly escaped with a single quote.
8. [ ] Draft a Bulk Email Campaign, verify the 500 recipient cap, and send it. Check `CustomerCommunicationLog` for the output.

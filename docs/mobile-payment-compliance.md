# Mobile Payment Compliance Strategy

This document outlines Verihub's architectural decisions regarding Apple App Store and Google Play Store compliance, specifically focusing on payment collection and invoicing.

## The Core Challenge
Both Apple and Google strictly enforce guidelines that prohibit applications from using third-party payment processors (like Stripe) to unlock features, buy digital goods, or process general transactions directly within a native application context, unless they meet very specific physical goods/services exemptions. Furthermore, embedding a web-view that processes a credit card can trigger store rejections.

## Verihub's Safe Harbor Architecture
To ensure 100% compliance and avoid costly app rejections, Verihub uses a **Strictly Web-Bound Payment Architecture**.

### What the Native App CAN Do:
1. **Manage CRM:** Users can view contacts, add notes, and check the timeline.
2. **Create Invoices:** Users can draft, edit, and send invoices to their clients.
3. **Monitor Status:** Users can see if an invoice is "PAID", "UNPAID", or "OVERDUE".
4. **Trigger Communications:** Users can trigger an email or copy a payment link to share.

### What the Native App CANNOT Do:
1. **No Embedded Checkouts:** The native app does not contain Stripe Elements, Apple Pay, or Google Pay SDKs.
2. **No In-App Payment Collection:** The app does not process credit cards or collect billing info directly.
3. **No Direct Webviews for Payment:** We do not pop up a hidden browser view to process the Stripe payment inside the app shell.

### The Checkout Flow
1. The Verihub user creates an invoice and shares it (via Email or by copying the link).
2. The end-customer (the person paying the invoice) opens the link.
3. The link opens in the customer's **default mobile web browser** (Safari, Chrome) entirely outside of the Verihub app ecosystem.
4. The customer views the secure Public Invoice Portal on the web and clicks "Pay Now".
5. They are redirected to Stripe Hosted Checkout on the web.
6. Upon success, Stripe sends a secure Webhook back to our backend.
7. The backend securely marks the invoice as Paid, generates a receipt, and pushes a notification back to the Verihub user's native app.

## Benefits
- **Zero Compliance Risk:** By completely isolating the payer flow to the public web, Verihub sidesteps App Store payment processor policies.
- **Enhanced Trust:** End-customers pay on a secure, standalone Stripe URL, rather than inside an app they don't recognize.
- **Lower Maintenance:** We rely entirely on Stripe Hosted Checkout for PCI compliance, SCA, 3D Secure, and localized payment methods without needing to update native SDKs.

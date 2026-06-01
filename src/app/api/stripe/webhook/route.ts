import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';
import { convertInvoiceToReceipt } from '@/lib/invoices/convertInvoiceToReceipt';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const testWebhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

    if (!webhookSecret && !testWebhookSecret) {
        console.warn("No Stripe webhook secrets are set. Cannot verify signature safely.");
    } else if (!signature) {
        return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
    }

    let event: Stripe.Event | null = null;
    let secretUsed: 'live' | 'test' | 'none' = 'none';

    try {
        if (signature) {
            // Try live secret first
            if (webhookSecret) {
                try {
                    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
                    secretUsed = 'live';
                } catch (liveErr) {
                    // Fall back to test secret if present
                    if (testWebhookSecret) {
                        try {
                            event = stripe.webhooks.constructEvent(body, signature, testWebhookSecret);
                            secretUsed = 'test';
                        } catch (testErr) {
                            throw new Error('Signature verification failed for both live and test secrets.');
                        }
                    } else {
                        throw liveErr;
                    }
                }
            } else if (testWebhookSecret) {
                event = stripe.webhooks.constructEvent(body, signature, testWebhookSecret);
                secretUsed = 'test';
            }
        } 
        
        if (!event) {
            event = JSON.parse(body) as Stripe.Event;
            console.warn("[Stripe Webhook] Unverified payload processed due to missing secret in environment.");
        } else {
            console.log(`[Stripe Webhook] Verified successfully using ${secretUsed} secret.`);
        }
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    try {
        // Idempotency check
        const existingEvent = await db.stripeWebhookEvent.findUnique({
            where: { id: event.id }
        });

        if (existingEvent) {
            console.log(`[Stripe Webhook] Idempotency hit: Event ${event.id} already processed.`);
            return NextResponse.json({ received: true, status: 'already_processed' });
        }

        // Pre-create the event so we don't process it twice concurrently
        await db.stripeWebhookEvent.create({
            data: {
                id: event.id,
                type: event.type,
                status: 'PROCESSING'
            }
        });

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;

                if (userId) {
                    const updateData: any = {};
                    
                    // Old logic: Activate the user
                    if (session.payment_status === 'paid') {
                        updateData.isActivated = true;
                        updateData.activatedAt = new Date();
                        updateData.activationSource = 'stripe';
                        updateData.activationTransactionId = session.id;
                    }

                    // New logic: Store subscription id
                    if (session.mode === 'subscription') {
                        updateData.stripeSubscriptionId = session.subscription as string;
                    }

                    if (Object.keys(updateData).length > 0) {
                        await db.user.update({
                            where: { id: userId },
                            data: updateData
                        });
                    }
                }
                
                // Invoice Payment Logic
                if (session.metadata?.source === 'invoice_payment' && session.metadata?.invoiceId) {
                    const invoiceId = session.metadata.invoiceId;
                    const installmentId = session.metadata?.installmentId;
                    const amountPaid = (session.amount_total || 0) / 100;
                    const currency = (session.currency || 'usd').toUpperCase();
                    
                    if (session.payment_status === 'paid') {
                        // Prevent webhook replay double-counting
                        const existingPayment = await db.invoicePayment.findFirst({
                            where: { stripeCheckoutSessionId: session.id }
                        });
                        
                        if (existingPayment) {
                            console.log(`[Stripe Webhook] Replay detected for session ${session.id}, skipping payment creation.`);
                            break;
                        }

                        let paymentRecordId = '';
                        let isFullyPaid = false;
                        let invoiceUserId = '';
                        let invoiceNumber = '';
                        let invoiceTitle = '';

                        await db.$transaction(async (tx) => {
                            // 1. Create Payment Record
                            const paymentRecord = await tx.invoicePayment.create({
                                data: {
                                    invoiceId: invoiceId,
                                    amount: amountPaid,
                                    currency: currency,
                                    status: 'SUCCEEDED',
                                    paymentMethod: 'Stripe Checkout',
                                    stripePaymentIntentId: session.payment_intent as string | undefined,
                                    stripeCheckoutSessionId: session.id,
                                    payerEmail: session.customer_details?.email || undefined,
                                    payerName: session.customer_details?.name || undefined
                                }
                            });
                            paymentRecordId = paymentRecord.id;

                            // 2. If installmentId, mark PAID
                            if (installmentId) {
                                await tx.invoiceInstallment.updateMany({
                                    where: { 
                                        id: installmentId,
                                        status: { not: 'PAID' }
                                    },
                                    data: {
                                        status: 'PAID',
                                        paidAt: new Date(),
                                        stripePaymentIntentId: session.payment_intent as string | undefined,
                                        stripeCheckoutSessionId: session.id
                                    }
                                });
                            }

                            // 3. Re-calculate invoice totals
                            const invoice = await tx.invoice.findUnique({
                                where: { id: invoiceId },
                                include: { installments: true, onlinePayments: { where: { status: 'SUCCEEDED' } } }
                            });

                            if (invoice) {
                                invoiceUserId = invoice.userId;
                                invoiceNumber = invoice.invoiceNumber || '';
                                invoiceTitle = invoice.title;

                                let newAmountPaid = 0;
                                if (invoice.paymentPlanEnabled && invoice.installments.length > 0) {
                                    newAmountPaid = invoice.installments
                                        .filter((i: any) => i.status === 'PAID')
                                        .reduce((sum: number, i: any) => sum + i.amount, 0);
                                } else {
                                    newAmountPaid = invoice.onlinePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
                                }

                                const remainingBalance = Math.max(0, invoice.total - newAmountPaid);
                                isFullyPaid = remainingBalance < 0.01;

                                if (isFullyPaid && invoice.paymentPlanEnabled) {
                                    await tx.invoiceInstallment.updateMany({
                                        where: { invoiceId: invoice.id, status: { not: 'PAID' } },
                                        data: { status: 'PAID', paidAt: new Date() }
                                    });
                                }

                                await tx.invoice.update({
                                    where: { id: invoiceId },
                                    data: {
                                        amountPaid: newAmountPaid,
                                        remainingBalance,
                                        paymentStatus: isFullyPaid ? 'PAID' : (newAmountPaid > 0 ? 'PARTIAL_PAID' : 'UNPAID'),
                                        status: isFullyPaid ? 'PAID' : invoice.status,
                                        lastPaymentAt: new Date(),
                                        paymentConfirmed: isFullyPaid ? true : invoice.paymentConfirmed,
                                        paymentConfirmedAt: isFullyPaid ? new Date() : invoice.paymentConfirmedAt,
                                    }
                                });
                            }
                        });

                        if (isFullyPaid && paymentRecordId && invoiceUserId) {
                            // Auto-generate Receipt (outside transaction)
                            const result = await convertInvoiceToReceipt(invoiceId);
                            if (result.success && result.receiptId) {
                                await db.invoicePayment.update({
                                    where: { id: paymentRecordId },
                                    data: { receiptGeneratedAt: new Date() }
                                });
                            }

                            // Create Notification
                            await db.notification.create({
                                data: {
                                    userId: invoiceUserId,
                                    type: 'SYSTEM',
                                    title: 'Invoice Paid',
                                    message: `Invoice #${invoiceNumber || invoiceTitle} was paid successfully.`,
                                    link: `/dashboard/invoices`
                                }
                            });
                        } else if (invoiceUserId) {
                            // Create Partial Payment Notification
                            await db.notification.create({
                                data: {
                                    userId: invoiceUserId,
                                    type: 'SYSTEM',
                                    title: 'Payment Received',
                                    message: `A payment of $${amountPaid.toFixed(2)} was received for Invoice #${invoiceNumber || invoiceTitle}.`,
                                    link: `/dashboard/invoices`
                                }
                            });
                        }
                    }
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const status = subscription.status; // active, past_due, canceled, etc.
                const priceId = subscription.items.data[0].price.id;
                const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
                
                let tier: "CORE" | "PRO" = "CORE";
                if ((status === 'active' || status === 'trialing') && priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
                    tier = "PRO";
                }

                const customerId = subscription.customer as string;
                const user = await db.user.findFirst({ where: { stripeCustomerId: customerId } });

                if (user) {
                    await db.user.update({
                        where: { id: user.id },
                        data: {
                            stripeSubscriptionId: subscription.id,
                            stripePriceId: priceId,
                            subscriptionStatus: status,
                            currentPeriodEnd: currentPeriodEnd,
                            plan: tier,
                            planStatus: status === 'active' || status === 'trialing' ? 'active' : 'inactive'
                        }
                    });
                } else {
                    // Try to find by email if stripeCustomerId was not set
                    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
                    if (customer.email) {
                        const userByEmail = await db.user.findUnique({ where: { email: customer.email } });
                        if (userByEmail) {
                            await db.user.update({
                                where: { id: userByEmail.id },
                                data: {
                                    stripeCustomerId: customerId,
                                    stripeSubscriptionId: subscription.id,
                                    stripePriceId: priceId,
                                    subscriptionStatus: status,
                                    currentPeriodEnd: currentPeriodEnd,
                                    plan: tier,
                                    planStatus: status === 'active' || status === 'trialing' ? 'active' : 'inactive'
                                }
                            });
                        }
                    }
                }
                break;
            }
            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.id) {
                    await db.invoiceInstallment.updateMany({
                        where: { stripeCheckoutSessionId: session.id, status: 'PAYMENT_PENDING' },
                        data: { status: 'UNPAID', stripeCheckoutSessionId: null }
                    });
                    await db.invoice.updateMany({
                        where: { stripeCheckoutSessionId: session.id, paymentStatus: 'PAYMENT_PENDING' },
                        data: { paymentStatus: 'UNPAID', stripeCheckoutSessionId: null }
                    });
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const intent = event.data.object as Stripe.PaymentIntent;
                if (intent.id) {
                    await db.invoiceInstallment.updateMany({
                        where: { stripePaymentIntentId: intent.id, status: 'PAYMENT_PENDING' },
                        data: { status: 'UNPAID', stripePaymentIntentId: null }
                    });
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Mark event as fully processed
        await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSED' }
        });
    } catch (error) {
        console.error('Webhook processing error:', error);
        
        if (event?.id) {
            await db.stripeWebhookEvent.update({
                where: { id: event.id },
                data: { status: 'FAILED' }
            }).catch(() => {});
        }

        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

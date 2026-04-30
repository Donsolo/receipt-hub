import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn("STRIPE_WEBHOOK_SECRET is not set. Cannot verify signature safely.");
    } else if (!signature) {
        return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        if (webhookSecret && signature) {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } else {
            event = JSON.parse(body) as Stripe.Event;
        }
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    try {
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
            case 'invoice.payment_succeeded':
            case 'invoice.payment_failed': {
                // Not actively used right now, but keeping for completeness
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

// Stripe CLI webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string || 'sk_test_fallback', {
            apiVersion: '2024-04-10' as any,
        });

        const rawBody = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!webhookSecret) {
            console.warn("STRIPE_WEBHOOK_SECRET is not set, bypassing signature validation (ONLY OK FOR DEV)");
        } else if (!signature) {
            return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
        }

        let event: Stripe.Event;

        try {
            if (webhookSecret && signature) {
                event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
            } else {
                event = JSON.parse(rawBody) as Stripe.Event; // fallback for missing secret dev mode
            }
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        // Handle the checkout.session.completed event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.payment_status !== 'paid') {
                return NextResponse.json({ received: true });
            }

            const userId = session.metadata?.userId;

            if (userId) {
                const user = await db.user.findUnique({ where: { id: userId } });

                // Idempotency: Prevent double-activation if Stripe retries
                if (user?.isActivated) {
                    return NextResponse.json({ received: true });
                }

                // Update the user
                await db.user.update({
                    where: { id: userId },
                    data: {
                        isActivated: true,
                        activatedAt: new Date(),
                        activationSource: 'stripe',
                        activationTransactionId: session.id,
                    }
                });
                console.log(`Activated user ${userId} via Stripe Webhook`);
            } else {
                console.warn('Checkout session completed, but no userId found in metadata.');
            }
        }

        // Return a response to acknowledge receipt of the event
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}

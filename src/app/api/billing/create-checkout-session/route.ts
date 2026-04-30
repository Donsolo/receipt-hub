import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userPayload = await verifyToken(token);
        if (!userPayload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const user = await db.user.findUnique({ where: { id: userPayload.userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        let customerId = user.stripeCustomerId;

        // If user doesn't have a Stripe customer ID, create one
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id
                }
            });
            customerId = customer.id;
            await db.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId }
            });
        }

        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app';

        if (!priceId) {
            console.error('Missing NEXT_PUBLIC_STRIPE_PRO_PRICE_ID');
            return NextResponse.json({ error: 'Billing configuration error' }, { status: 500 });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/billing`,
            metadata: {
                userId: user.id
            }
        });

        if (!session.url) {
            return NextResponse.json({ error: 'Failed to create Stripe session URL' }, { status: 500 });
        }

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

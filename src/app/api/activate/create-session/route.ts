import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import Stripe from 'stripe';

export async function POST(request: Request) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string || 'sk_test_fallback', {
            apiVersion: '2024-04-10' as any,
        });

        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Don't recreate sessions for activated users
        if (user.isActivated || user.isEarlyAccess) {
            return NextResponse.json({ error: 'User already activated' }, { status: 400 });
        }

        const baseUrl = new URL(request.url).origin;

        const priceId = process.env.STRIPE_CORE_PRICE_ID || (process.env.NODE_ENV !== 'production' ? 'price_fallback_for_dev' : null);
        if (!priceId) {
            return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: {
                userId: user.userId,
            },
            success_url: `${baseUrl}/dashboard?activation=success`,
            cancel_url: `${baseUrl}/activate`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Session Error:', error);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}

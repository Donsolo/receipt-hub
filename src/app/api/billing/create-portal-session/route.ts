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

        if (!user.stripeCustomerId) {
            return NextResponse.json({ error: 'No Stripe customer found for this user' }, { status: 400 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app';

        // Create Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${appUrl}/billing`,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe portal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

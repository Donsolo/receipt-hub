import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { getInvoiceStripeInstance } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userPayload = await verifyToken(token);
        if (!userPayload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const user = await db.user.findUnique({ where: { id: userPayload.userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // PRO check
        const isPro = (user.plan === "PRO" && user.planStatus !== "inactive") || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
        if (!isPro) {
            return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
        }

        if (user.connectOnboardingStatus !== 'COMPLETE') {
            return NextResponse.json({ error: 'Onboarding not complete' }, { status: 400 });
        }

        if (!user.stripeConnectAccountId) {
            return NextResponse.json({ error: 'No Connect account found' }, { status: 404 });
        }

        const { stripeInstance } = getInvoiceStripeInstance();

        // Create Login Link
        const loginLink = await stripeInstance.accounts.createLoginLink(user.stripeConnectAccountId);

        return NextResponse.json({ url: loginLink.url });

    } catch (error: any) {
        console.error('Create Login Link Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

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
            return NextResponse.json({ error: 'Pro subscription required for payment processing' }, { status: 403 });
        }

        const { stripeInstance } = getInvoiceStripeInstance();
        let accountId = user.stripeConnectAccountId;

        // Create the Express account if it doesn't exist
        if (!accountId) {
            const account = await stripeInstance.accounts.create({
                type: 'express',
                email: user.email,
                business_profile: {
                    name: user.businessName || undefined,
                },
                metadata: {
                    userId: user.id
                }
            });
            accountId = account.id;

            await db.user.update({
                where: { id: user.id },
                data: {
                    stripeConnectAccountId: accountId,
                    connectOnboardingStatus: 'IN_PROGRESS'
                }
            });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://verihub.app';

        // Create Account Link
        const accountLink = await stripeInstance.accountLinks.create({
            account: accountId,
            refresh_url: `${appUrl}/connect/refresh`,
            return_url: `${appUrl}/connect/return`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });

    } catch (error: any) {
        console.error('Create Account Link Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userPayload = await verifyToken(token);
        if (!userPayload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const user = await db.user.findUnique({
            where: { id: userPayload.userId },
            select: {
                connectOnboardingStatus: true,
                connectChargesEnabled: true,
                connectPayoutsEnabled: true,
                connectOnboardedAt: true
            }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({
            status: user.connectOnboardingStatus,
            chargesEnabled: user.connectChargesEnabled,
            payoutsEnabled: user.connectPayoutsEnabled,
            onboardedAt: user.connectOnboardedAt
        });

    } catch (error: any) {
        console.error('Connect Status Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

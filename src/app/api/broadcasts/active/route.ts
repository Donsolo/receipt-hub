import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json([], { status: 200 }); // Return empty for non-auth

        const user = await verifyToken(token);
        if (!user) return NextResponse.json([], { status: 200 });

        const now = new Date();

        // Map user plan to broadcast target
        // Plan { CORE, PRO } -> BroadcastTarget { FREE_USERS, PRO_USERS, BUSINESS_USERS, ALL_USERS }
        const userPlan = user.plan || 'CORE';
        const eligibleTargets: string[] = ['ALL_USERS'];

        if (userPlan === 'CORE') {
            eligibleTargets.push('FREE_USERS');
        } else if (userPlan === 'PRO') {
            eligibleTargets.push('PRO_USERS');
            eligibleTargets.push('BUSINESS_USERS'); // Mapping PRO to BUSINESS for now
        }

        // Fetch broadcasts that:
        // 1. Are active
        // 2. Haven't expired
        // 3. Match the user's target group
        // 4. Haven't been dismissed by this user

        const broadcasts = await db.broadcastMessage.findMany({
            where: {
                isActive: true,
                AND: [
                    {
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: now } }
                        ]
                    },
                    {
                        target: { in: eligibleTargets as any }
                    },
                    {
                        NOT: {
                            id: {
                                in: (await db.broadcastDismissal.findMany({
                                    where: { userId: user.userId },
                                    select: { broadcastId: true }
                                })).map(d => d.broadcastId)
                            }
                        }
                    }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(broadcasts);
    } catch (error) {
        console.error('Error fetching active broadcasts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

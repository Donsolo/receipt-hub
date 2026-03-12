import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { broadcastId } = await request.json();
        if (!broadcastId) return NextResponse.json({ error: 'Missing broadcastId' }, { status: 400 });

        // Create dismissal record
        await db.broadcastDismissal.upsert({
            where: {
                userId_broadcastId: {
                    userId: user.userId,
                    broadcastId: broadcastId
                }
            },
            update: {}, // No change if already exists
            create: {
                userId: user.userId,
                broadcastId: broadcastId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error dismissing broadcast:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

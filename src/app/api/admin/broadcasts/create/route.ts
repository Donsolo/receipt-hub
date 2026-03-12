import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, message, type, target, expiresAt, dismissible } = body;

        // Validation
        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
        }

        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message body must be 2000 characters or less.' }, { status: 400 });
        }

        // Safety Limit: Max 10 per day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const countToday = await db.broadcastMessage.count({
            where: {
                createdAt: {
                    gte: startOfDay
                }
            }
        });

        if (countToday >= 10) {
            return NextResponse.json({ error: 'Maximum limit of 10 broadcasts per day reached.' }, { status: 429 });
        }

        const newBroadcast = await db.broadcastMessage.create({
            data: {
                title,
                message,
                type: type || 'INFO',
                target: target || 'ALL_USERS',
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                dismissible: dismissible !== undefined ? dismissible : true,
                createdBy: user.userId,
                isActive: true
            }
        });

        return NextResponse.json(newBroadcast);
    } catch (error) {
        console.error('Error creating broadcast:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

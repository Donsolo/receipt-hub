import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) {
            if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 });
            throw e;
        }

        const body = await request.json();
        const { notificationId } = body;

        if (!notificationId || typeof notificationId !== 'string') {
            return NextResponse.json({ error: 'Invalid notificationId' }, { status: 400 });
        }

        // Verify ownership and existence in one query
        const notification = await db.notification.findUnique({
            where: { id: notificationId },
            select: { userId: true }
        });

        if (!notification) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        if (notification.userId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedNotification = await db.notification.update({
            where: { id: notificationId },
            data: { read: true },
            select: { id: true, read: true }
        });

        return NextResponse.json({ success: true, notification: updatedNotification });
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

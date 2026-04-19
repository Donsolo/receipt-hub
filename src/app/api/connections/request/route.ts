import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendNativePush } from '@/lib/push';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { receiverId } = body;

        if (!receiverId || receiverId === user.userId) {
            return NextResponse.json({ error: 'Invalid receiver' }, { status: 400 });
        }

        // Check for duplicates in either direction
        const existingConnection = await (db as any).connection.findFirst({
            where: {
                OR: [
                    { requesterId: user.userId, receiverId: receiverId },
                    { requesterId: receiverId, receiverId: user.userId },
                ]
            }
        });

        if (existingConnection) {
            return NextResponse.json({ error: 'Connection or request already exists' }, { status: 400 });
        }

        const connection = await (db as any).connection.create({
            data: {
                requesterId: user.userId,
                receiverId: receiverId,
                status: 'pending' // Enforced as pending
            }
        });

        // ------------------------------------------------------------------
        // Fire Notification (Non-blocking)
        // ------------------------------------------------------------------
        try {
            const receiverPref = await db.user.findUnique({
                where: { id: receiverId },
                select: { notifyConnectionRequests: true }
            });

            if (receiverPref?.notifyConnectionRequests) {
                const sender = await db.user.findUnique({
                    where: { id: user.userId },
                    select: { name: true }
                });
                const senderName = sender?.name || 'A user';

                const notification = await db.notification.create({
                    data: {
                        userId: receiverId,
                        type: 'CONNECTION_REQUEST',
                        title: 'New Connection Request',
                        message: `${senderName} sent you a connection request.`,
                        link: '/business-network',
                        read: false
                    }
                });

                const userDevices = await db.pushToken.findMany({ where: { userId: receiverId } });
                const tokens = userDevices.map(d => d.token);
                if (tokens.length > 0) {
                    await sendNativePush(tokens, {
                        title: notification.title,
                        body: notification.message,
                        data: { route: notification.link || '/' }
                    });
                }
            }
        } catch (notifErr) {
            console.error('Failed to dispatch connection request notification:', notifErr);
            // Continue execution, do not fail the request
        }

        return NextResponse.json(connection);
    } catch (error) {
        console.error('Connection request error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendNativePush } from '@/lib/push';

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const connectionId = params.id;
        const body = await request.json();
        const { status } = body;

        // Ensure we're only accepting or declining
        if (status !== 'accepted' && status !== 'declined') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const connection = await (db as any).connection.findUnique({
            where: { id: connectionId }
        });

        // The current user MUST be the receiver to respond
        if (!connection || connection.receiverId !== user.userId) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        // Must be in pending state
        if (connection.status !== 'pending') {
            return NextResponse.json({ error: 'Connection already processed' }, { status: 400 });
        }

        const updatedConnection = await (db as any).connection.update({
            where: { id: connectionId },
            data: { status }
        });

        // ------------------------------------------------------------------
        // Fire Notification on Acceptance (Non-blocking)
        // ------------------------------------------------------------------
        if (status === 'accepted') {
            try {
                const targetPref = await db.user.findUnique({
                    where: { id: connection.requesterId },
                    select: { notifyConnectionAccepted: true }
                });

                if (targetPref?.notifyConnectionAccepted) {
                    const receiver = await db.user.findUnique({
                        where: { id: user.userId },
                        select: { name: true }
                    });
                    const receiverName = receiver?.name || 'A user';

                    const notification = await db.notification.create({
                        data: {
                            userId: connection.requesterId,
                            type: 'CONNECTION_ACCEPTED',
                            title: 'Connection Accepted',
                            message: `${receiverName} accepted your connection request.`,
                            link: '/business-network',
                            read: false
                        }
                    });

                    const userDevices = await db.pushToken.findMany({ where: { userId: connection.requesterId } });
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
                console.error('Failed to dispatch connection accepted notification:', notifErr);
            }
        }

        return NextResponse.json(updatedConnection);
    } catch (error) {
        console.error('Respond connection error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

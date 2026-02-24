import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const connections = await (db as any).connection.findMany({
            where: {
                OR: [
                    { requesterId: user.userId },
                    { receiverId: user.userId }
                ],
                status: 'accepted'
            },
            include: {
                requester: {
                    select: { id: true, name: true, businessName: true, email: true }
                },
                receiver: {
                    select: { id: true, name: true, businessName: true, email: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Format to a flat list of users connected to the current user
        const formattedConnections = connections.map((conn: any) => {
            const isRequester = conn.requesterId === user.userId;
            const peer = isRequester ? conn.receiver : conn.requester;
            return {
                connectionId: conn.id,
                status: conn.status,
                connectedAt: conn.connectedAt,
                connectedUser: {
                    id: peer.id,
                    name: peer.name,
                    businessName: peer.businessName,
                    email: peer.email
                }
            };
        });

        const res = NextResponse.json(formattedConnections);
        res.headers.set('Cache-Control', 'no-store, max-age=0');
        return res;
    } catch (error) {
        console.error('Get connections error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

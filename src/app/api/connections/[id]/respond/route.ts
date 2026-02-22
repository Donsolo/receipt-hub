import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

        return NextResponse.json(updatedConnection);
    } catch (error) {
        console.error('Respond connection error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

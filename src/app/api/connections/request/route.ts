import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        return NextResponse.json(connection);
    } catch (error) {
        console.error('Connection request error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

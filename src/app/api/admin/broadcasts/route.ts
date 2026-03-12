import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const broadcasts = await db.broadcastMessage.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(broadcasts);
    } catch (error) {
        console.error('Error fetching broadcasts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

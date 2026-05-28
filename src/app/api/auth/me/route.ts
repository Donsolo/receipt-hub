import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const payload = await verifyToken(token || '');

    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await (db as any).user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            role: true,
            name: true,
            businessName: true,
            businessLogoPath: true
        }
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const payload = await verifyToken(token || '');

    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        id: payload.userId,
        email: payload.email,
        role: payload.role
    });
}

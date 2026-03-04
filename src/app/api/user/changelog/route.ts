import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function PATCH(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { version } = body;

        if (!version || typeof version !== 'string') {
            return NextResponse.json({ error: 'Invalid version provided' }, { status: 400 });
        }

        try {
            await (db as any).user.update({
                where: { id: user.userId },
                data: { lastSeenChangelogVersion: version },
            });
            return NextResponse.json({ success: true, version });
        } catch (updateError: any) {
            if (updateError.code === 'P2025') {
                // User from token no longer exists in DB (e.g. after local DB wipe)
                return NextResponse.json({ error: 'User not found. Please log in again.' }, { status: 401 });
            }
            throw updateError;
        }
    } catch (error) {
        console.error('Update Changelog Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

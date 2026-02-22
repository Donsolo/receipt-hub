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

        await (db as any).user.update({
            where: { id: user.userId },
            data: { lastSeenChangelogVersion: version },
        });

        return NextResponse.json({ success: true, version });
    } catch (error) {
        console.error('Update Changelog Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

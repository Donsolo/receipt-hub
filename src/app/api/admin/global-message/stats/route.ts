import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userPayload = await verifyToken(token);
        if (!userPayload || !await isAdmin(userPayload.userId as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Count users by tier
        const [total, core, pro] = await Promise.all([
            db.user.count(),
            db.user.count({ where: { plan: 'CORE' } }),
            db.user.count({ where: { plan: 'PRO' } })
        ]);

        return NextResponse.json({
            TOTAL: total,
            ALL_USERS: total,
            FREE_USERS: core,
            PRO_USERS: pro,
            BUSINESS_USERS: 0 // Placeholder as no business plan defined yet
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const user = await verifyToken(token || '');

        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                createdAt: true,
                role: true,
                _count: {
                    select: { receipts: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

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

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');

        if (!q || q.trim() === '') {
            return NextResponse.json([]);
        }

        // Case-insensitive exact matching via ilike behavior is supported by Prisma via 'contains' + 'mode: insensitive'
        const suggestions = await (db as any).savedReceiptItem.findMany({
            where: {
                userId: user.userId,
                name: {
                    contains: q.trim(),
                    mode: 'insensitive'
                }
            },
            orderBy: [
                { usageCount: 'desc' },
                { name: 'asc' }
            ],
            take: 5,
            select: {
                name: true
            }
        });

        const stringsOnly = suggestions.map((s: any) => s.name);

        return NextResponse.json(stringsOnly);
    } catch (error) {
        console.error('API Suggest Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

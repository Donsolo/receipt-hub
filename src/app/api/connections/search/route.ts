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
        const query = searchParams.get('q');

        if (!query || query.trim().length < 2) {
            return NextResponse.json([]);
        }

        const searchTerm = query.trim();

        const results = await (db as any).user.findMany({
            where: {
                id: { not: user.userId },
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { businessName: { contains: searchTerm, mode: 'insensitive' } },
                ],
                // Exclude if connection already exists between these users
                sentConnections: {
                    none: { receiverId: user.userId }
                },
                receivedConnections: {
                    none: { requesterId: user.userId }
                }
            },
            select: {
                id: true,
                name: true,
                businessName: true,
                // Explicitly excluding 'email' per requirements
            },
            take: 5
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

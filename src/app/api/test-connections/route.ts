import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const users = await (db as any).user.findMany({
            take: 10,
            select: { id: true, email: true, name: true }
        });
        const conns = await (db as any).connection.findMany({
            take: 10,
            include: { requester: { select: { email: true } }, receiver: { select: { email: true } } }
        });
        return NextResponse.json({ users, conns });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

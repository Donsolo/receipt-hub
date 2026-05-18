import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tags = await db.customerTag.findMany({
            where: { ownerId: user.userId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ success: true, tags }, { status: 200 });
    } catch (error) {
        console.error('Fetch tags error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, color } = await req.json();
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
        }

        const tag = await db.customerTag.upsert({
            where: {
                ownerId_name: { ownerId: user.userId, name: name.trim() }
            },
            update: { color },
            create: {
                ownerId: user.userId,
                name: name.trim(),
                color
            }
        });

        return NextResponse.json({ success: true, tag }, { status: 201 });
    } catch (error) {
        console.error('Create tag error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

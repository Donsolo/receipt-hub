import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tags = await db.customerTag.findMany({
            where: { ownerId: user.id },
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
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, color } = await req.json();
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
        }

        const tag = await db.customerTag.upsert({
            where: {
                ownerId_name: { ownerId: user.id, name: name.trim() }
            },
            update: { color },
            create: {
                ownerId: user.id,
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

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const heroes = await (db as any).heroImage.findMany();
        return NextResponse.json(heroes);
    } catch (error) {
        console.error('Error fetching heroes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

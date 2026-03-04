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

        const announcements = await (db as any).announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, type, isActive } = body;

        if (!title || !content || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newAnnouncement = await (db as any).announcement.create({
            data: {
                title,
                content,
                type,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json(newAnnouncement);
    } catch (error) {
        console.error('Error creating announcement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

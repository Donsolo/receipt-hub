import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, type, isActive } = body;

        const updatedAnnouncement = await (db as any).announcement.update({
            where: { id: params.id },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(type && { type }),
                ...(isActive !== undefined && { isActive }),
            }
        });

        return NextResponse.json(updatedAnnouncement);
    } catch (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await (db as any).announcement.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

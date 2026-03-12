import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, message, type, target, expiresAt, dismissible, isActive } = body;

        if (message && message.length > 2000) {
            return NextResponse.json({ error: 'Message body must be 2000 characters or less.' }, { status: 400 });
        }

        const updatedBroadcast = await db.broadcastMessage.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(message && { message }),
                ...(type && { type }),
                ...(target && { target }),
                ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
                ...(dismissible !== undefined && { dismissible }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(updatedBroadcast);
    } catch (error) {
        console.error('Error updating broadcast:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Also delete dismissals associated with this broadcast to keep DB clean
        await db.$transaction([
            db.broadcastDismissal.deleteMany({ where: { broadcastId: id } }),
            db.broadcastMessage.delete({ where: { id } })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting broadcast:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

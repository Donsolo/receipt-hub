import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, noteId: string }> }) {
    try {
        const { id, noteId } = await params;
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const note = await db.customerContactNote.findUnique({ where: { id: noteId } });
        if (!note || note.ownerId !== user.id || note.customerContactId !== id) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        await db.customerContactNote.delete({ where: { id: noteId } });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Delete note error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

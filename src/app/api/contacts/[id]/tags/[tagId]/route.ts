import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, tagId: string }> }) {
    try {
        const { id, tagId } = await params;
        ')[0];
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await db.customerContact.findUnique({ where: { id } });
        if (!contact || contact.ownerId !== user.id) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        await db.customerContactTag.deleteMany({
            where: {
                customerContactId: id,
                tagId
            }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Remove tag error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

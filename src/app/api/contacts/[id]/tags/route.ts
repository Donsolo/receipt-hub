import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await db.customerContact.findUnique({ where: { id } });
        if (!contact || contact.ownerId !== user.id) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        const { tagId } = await req.json();
        if (!tagId) return NextResponse.json({ error: 'Missing tagId' }, { status: 400 });

        const tag = await db.customerTag.findUnique({ where: { id: tagId } });
        if (!tag || tag.ownerId !== user.id) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
        }

        const contactTag = await db.customerContactTag.upsert({
            where: {
                customerContactId_tagId: { customerContactId: id, tagId }
            },
            update: {},
            create: {
                customerContactId: id,
                tagId
            }
        });

        return NextResponse.json({ success: true, contactTag }, { status: 201 });
    } catch (error) {
        console.error('Attach tag error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

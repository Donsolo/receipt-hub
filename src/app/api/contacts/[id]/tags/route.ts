import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await db.customerContact.findUnique({ where: { id } });
        if (!contact || contact.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        const { tagId } = await req.json();
        if (!tagId) return NextResponse.json({ error: 'Missing tagId' }, { status: 400 });

        const tag = await db.customerTag.findUnique({ where: { id: tagId } });
        if (!tag || tag.ownerId !== user.userId) {
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

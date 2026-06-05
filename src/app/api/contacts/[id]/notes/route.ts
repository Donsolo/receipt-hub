import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        ')[0];
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await db.customerContact.findUnique({ where: { id } });
        if (!contact || contact.ownerId !== user.id) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        const { content } = await req.json();
        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        const note = await db.customerContactNote.create({
            data: {
                customerContactId: id,
                ownerId: user.id,
                content: content.trim()
            }
        });

        return NextResponse.json({ success: true, note }, { status: 201 });
    } catch (error) {
        console.error('Add note error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

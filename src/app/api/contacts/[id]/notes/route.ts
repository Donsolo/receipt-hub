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

        const { content } = await req.json();
        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        const note = await db.customerContactNote.create({
            data: {
                customerContactId: id,
                ownerId: user.userId,
                content: content.trim()
            }
        });

        return NextResponse.json({ success: true, note }, { status: 201 });
    } catch (error) {
        console.error('Add note error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

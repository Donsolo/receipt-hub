import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await db.customerContact.findUnique({
            where: { id },
            include: {
                notesArray: { orderBy: { createdAt: 'desc' } },
                tags: { include: { tag: true } },
                invoices: {
                    include: {
                        installments: true
                    }
                }
            }
        });

        if (!contact || contact.ownerId !== user.userId) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, contact }, { status: 200 });
    } catch (error) {
        console.error('Fetch contact error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

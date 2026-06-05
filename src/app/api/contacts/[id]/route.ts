import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        ')[0];
        
        const user = await getCurrentUser();
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

        if (!contact || contact.ownerId !== user.id) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, contact }, { status: 200 });
    } catch (error) {
        console.error('Fetch contact error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

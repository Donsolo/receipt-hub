import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const authUser = await getCurrentUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const owner = await db.user.findUnique({ where: { id: authUser.id } });
        const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';

        const contacts = await db.customerContact.findMany({
            where: { ownerId: authUser.id },
            include: {
                tags: { include: { tag: true } },
                invoices: {
                    include: {
                        installments: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const tags = await db.customerTag.findMany({
            where: { ownerId: authUser.id },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ success: true, contacts, tags, isPro });

    } catch (e: any) {
        console.error('API Error /api/contacts/dashboard:', e);
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = (request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0] || (request.headers.get('authorization')?.startsWith('Bearer ') ? request.headers.get('authorization')?.substring(7) : undefined));
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const owner = await db.user.findUnique({ where: { id: user.userId } });
        if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isPro = (owner.plan === 'PRO' && owner.planStatus !== 'inactive') || owner.role === 'ADMIN' || owner.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Invoice Aging is a Pro feature.' }, { status: 403 });
        }

        // Fetch unpaid and partial invoices
        const invoices = await db.invoice.findMany({
            where: {
                userId: user.userId,
                status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
                remainingBalance: { gt: 0 }
            },
            select: {
                id: true,
                invoiceNumber: true,
                title: true,
                clientName: true,
                clientEmail: true,
                total: true,
                amountPaid: true,
                remainingBalance: true,
                dueDate: true,
                status: true,
                paymentStatus: true,
                lastPaymentReminderAt: true,
                publicToken: true
            },
            orderBy: { dueDate: 'asc' }
        });

        const now = new Date();
        now.setHours(0,0,0,0);

        const buckets = {
            current: [] as any[],
            days1to15: [] as any[],
            days16to30: [] as any[],
            days31to60: [] as any[],
            days60Plus: [] as any[],
            noDueDate: [] as any[]
        };

        invoices.forEach(inv => {
            if (!inv.dueDate) {
                buckets.noDueDate.push(inv);
                return;
            }

            const dueDate = new Date(inv.dueDate);
            dueDate.setHours(0,0,0,0);

            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) buckets.current.push(inv);
            else if (diffDays <= 15) buckets.days1to15.push(inv);
            else if (diffDays <= 30) buckets.days16to30.push(inv);
            else if (diffDays <= 60) buckets.days31to60.push(inv);
            else buckets.days60Plus.push(inv);
        });

        return NextResponse.json({ success: true, buckets });
    } catch (error) {
        console.error('Aging API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

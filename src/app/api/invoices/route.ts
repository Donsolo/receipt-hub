import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const where: any = {
            OR: [
                { userId: user.id },
                { paymentRequestLogs: { some: { recipientUserId: user.id } } }
            ]
        };

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.issueDate = {};
            if (startDate) where.issueDate.gte = new Date(startDate);
            if (endDate) where.issueDate.lte = new Date(endDate);
        }

        const invoices = await prisma.invoice.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                items: true
            }
        });

        return NextResponse.json({ success: true, invoices }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Invoices Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

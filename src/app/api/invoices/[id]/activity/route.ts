import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const invoice = await db.invoice.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const logs = await db.invoicePaymentRequestLog.findMany({
            where: { invoiceId: id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return NextResponse.json({ logs });

    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

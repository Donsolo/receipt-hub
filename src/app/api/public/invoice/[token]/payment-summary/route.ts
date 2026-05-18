import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        if (rateLimit(ip, 30)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const { token } = await params;
        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const invoice = await db.invoice.findUnique({
            where: { publicToken: token },
            select: {
                paymentStatus: true,
                amountPaid: true,
                total: true,
                remainingBalance: true,
                convertedReceiptId: true,
                status: true
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.status === 'CANCELLED') {
             return NextResponse.json({ error: 'Invoice cancelled' }, { status: 410 });
        }

        const remainingBalance = invoice.remainingBalance ?? Math.max(0, invoice.total - (invoice.amountPaid || 0));

        return NextResponse.json({
            paymentStatus: invoice.paymentStatus,
            amountPaid: invoice.amountPaid || 0,
            remainingBalance: remainingBalance,
            convertedReceiptId: invoice.convertedReceiptId
        });

    } catch (error) {
        console.error('Failed to fetch payment summary:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

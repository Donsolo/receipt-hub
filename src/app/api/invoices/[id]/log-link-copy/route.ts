import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(
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
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        // Throttle copying logs to once per hour to prevent spamming the activity log if the user clicks copy 10 times.
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentLog = await db.invoicePaymentRequestLog.findFirst({
            where: {
                invoiceId: id,
                channel: 'COPY_LINK',
                action: 'LINK_COPIED',
                createdAt: { gte: oneHourAgo }
            }
        });

        if (!recentLog) {
            await db.invoicePaymentRequestLog.create({
                data: {
                    invoiceId: id,
                    channel: 'COPY_LINK',
                    action: 'LINK_COPIED',
                    status: 'SENT'
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to log link copy:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

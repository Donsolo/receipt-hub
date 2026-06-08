import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendInvoicePaymentEmail } from '@/lib/email';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = (request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0] || (request.headers.get('authorization')?.startsWith('Bearer ') ? request.headers.get('authorization')?.substring(7) : undefined));
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { email, message, enableOnlinePayment } = body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
        }

        // 1. Verify Sender is Pro/Admin
        const sender = await db.user.findUnique({
            where: { id: user.userId }
        });
        if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isPro = (sender.plan === 'PRO' && sender.planStatus !== 'inactive') || sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Email payment requests are a Pro feature.' }, { status: 403 });
        }

        // 2. Fetch and Validate Invoice
        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot request payment for a fully paid invoice' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot request payment for a cancelled invoice' }, { status: 400 });
        
        const remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
        if (remainingBalance <= 0) return NextResponse.json({ error: 'Invoice has no remaining balance' }, { status: 400 });

        // Enable online payments if requested
        if (!invoice.acceptOnlinePayment) {
            if (enableOnlinePayment) {
                await db.invoice.update({
                    where: { id },
                    data: { acceptOnlinePayment: true }
                });
                invoice.acceptOnlinePayment = true;
            } else {
                return NextResponse.json({ error: 'Online payments must be enabled to send a payment request link.' }, { status: 400 });
            }
        }

        // 3. Generate Public Token if missing
        let publicToken = invoice.publicToken;
        if (!publicToken) {
            const { randomBytes } = await import('crypto');
            publicToken = randomBytes(32).toString('hex');
            await db.invoice.update({
                where: { id },
                data: { publicToken }
            });
        }

        // 4. Rate Limiting Check
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentLog = await db.invoicePaymentRequestLog.findFirst({
            where: {
                invoiceId: id,
                channel: 'EMAIL',
                action: 'REQUEST_SENT',
                recipientEmail: email,
                createdAt: { gte: fifteenMinsAgo }
            }
        });

        if (recentLog) {
            return NextResponse.json({ error: 'An email request was already sent to this address recently. Please wait 15 minutes.' }, { status: 429 });
        }

        // 5. Generate Request Log ID beforehand for tracking
        const { createId } = await import('@paralleldrive/cuid2');
        const requestLogId = createId();

        const businessName = sender.businessName || sender.name || sender.email?.split('@')[0] || 'A business';
        const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app'}/portal/invoice/${publicToken}?src=email&rid=${requestLogId}`;
        
        const emailSent = await sendInvoicePaymentEmail({
            to: email,
            businessName,
            invoiceNumber: invoice.invoiceNumber || invoice.title,
            remainingBalance,
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
            paymentLink,
            customMessage: message?.trim()
        });

        if (!emailSent) {
            // Log Failure
            await db.invoicePaymentRequestLog.create({
                data: {
                    id: requestLogId,
                    invoiceId: id,
                    channel: 'EMAIL',
                    recipientEmail: email,
                    action: 'REQUEST_SENT',
                    status: 'FAILED'
                }
            });
            return NextResponse.json({ error: 'Email service is not configured or failed to send.' }, { status: 500 });
        }

        // 6. Log Success
        await db.invoicePaymentRequestLog.create({
            data: {
                id: requestLogId,
                invoiceId: id,
                channel: 'EMAIL',
                recipientEmail: email,
                action: 'REQUEST_SENT',
                status: 'SENT'
            }
        });

        if (invoice.customerContactId) {
            await db.customerCommunicationLog.create({
                data: {
                    ownerId: user.userId,
                    customerContactId: invoice.customerContactId,
                    channel: 'EMAIL',
                    direction: 'OUTBOUND',
                    subject: 'Invoice Payment Request',
                    contentPreview: message?.trim() || `Requested payment for invoice ${invoice.invoiceNumber || invoice.title}`,
                    relatedInvoiceId: id,
                    status: 'SENT'
                }
            });
        }

        // Update invoice status if draft
        if (invoice.status === 'DRAFT') {
            await db.invoice.update({
                where: { id },
                data: { status: 'SENT', sentAt: new Date() }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to send email request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

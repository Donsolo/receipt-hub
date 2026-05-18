import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (rateLimit(ip, 20)) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { sessionId } = await params;

        if (!sessionId) {
            return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
        }

        // We check the InvoicePayment model because the webhook inserts here.
        // This is safer than exposing raw Stripe data.
        const payment = await prisma.invoicePayment.findFirst({
            where: { stripeCheckoutSessionId: sessionId },
            include: {
                invoice: {
                    select: {
                        publicToken: true,
                        invoiceNumber: true,
                        title: true,
                        paymentStatus: true,
                        convertedReceiptId: true,
                        user: {
                            select: {
                                businessName: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!payment || !payment.invoice) {
            // Processing: The webhook might not have fired yet. 
            // We return a 'PROCESSING' status so the UI knows to keep polling or wait.
            return NextResponse.json({ 
                success: true, 
                status: 'PROCESSING',
                message: 'Payment received. We are finalizing your invoice status.' 
            }, { status: 200 });
        }

        const businessName = payment.invoice.user?.businessName || payment.invoice.user?.name || payment.invoice.user?.email?.split('@')[0] || null;

        // Note: Receipt sharing link. In Phase 1 we use authenticated dashboard links for receipts, 
        // but if public tokens don't exist for receipts, we just pass the ID or a generic message.
        // We will just pass convertedReceiptId for the UI to use appropriately.

        return NextResponse.json({
            success: true,
            status: payment.status, // e.g., 'SUCCEEDED'
            amount: payment.amount,
            currency: payment.currency,
            invoiceToken: payment.invoice.publicToken,
            invoiceNumber: payment.invoice.invoiceNumber || payment.invoice.title,
            businessName: businessName,
            paymentStatus: payment.invoice.paymentStatus, // 'PAID' or 'PARTIAL_PAID'
            convertedReceiptId: payment.invoice.convertedReceiptId
        }, { status: 200 });

    } catch (error: any) {
        console.error('Public Session Fetch Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

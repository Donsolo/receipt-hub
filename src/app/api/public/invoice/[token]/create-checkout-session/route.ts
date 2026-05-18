import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (rateLimit(`stripe-checkout-${ip}`, 10)) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { token } = await params;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        const bodyText = await req.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const { installmentId, payFullRemaining } = body;

        const invoice = await db.invoice.findUnique({
            where: { publicToken: token },
            include: { user: true }
        });

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found or invalid URL' }, { status: 410 });
        }

        // Verify Owner is Pro
        const isPro = (invoice.user?.plan === "PRO" && invoice.user?.planStatus !== "inactive") || invoice.user?.role === "ADMIN" || invoice.user?.role === "SUPER_ADMIN";
        if (!isPro) {
            return NextResponse.json({ success: false, error: 'Online payments are not enabled for this account.' }, { status: 403 });
        }

        if (!invoice.acceptOnlinePayment) {
            return NextResponse.json({ success: false, error: 'Online payments are currently disabled for this invoice.' }, { status: 400 });
        }

        if (invoice.status === 'PAID' || invoice.paymentStatus === 'PAID') {
            return NextResponse.json({ success: false, error: 'This invoice has already been fully paid.' }, { status: 400 });
        }

        if (invoice.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'This invoice has been cancelled.' }, { status: 400 });
        }

        // Calculate secure remaining balance on server
        const totalPaid = invoice.amountPaid || 0;
        let remainingBalance = invoice.remainingBalance ?? (invoice.total - totalPaid);
        
        // Ensure remaining balance is accurate
        if (remainingBalance < 0) remainingBalance = 0;

        if (remainingBalance <= 0) {
            return NextResponse.json({ success: false, error: 'There is no remaining balance to pay.' }, { status: 400 });
        }

        // Use lowest common denominator (cents for USD)
        let amountInCents = Math.round(remainingBalance * 100);
        let itemName = `Invoice ${invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ''}`;
        let itemDescription = invoice.title;
        let paymentMode = "remaining_balance";

        if (invoice.paymentPlanEnabled && installmentId) {
            // Find installment
            const installment = await db.invoiceInstallment.findFirst({
                where: { id: installmentId, invoiceId: invoice.id }
            });

            if (!installment) {
                return NextResponse.json({ success: false, error: 'Installment not found' }, { status: 404 });
            }

            if (installment.status === 'PAID') {
                return NextResponse.json({ success: false, error: 'This installment is already paid' }, { status: 400 });
            }

            amountInCents = Math.round(installment.amount * 100);
            itemName = installment.label || `Installment for Invoice ${invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ''}`;
            itemDescription = `Payment for ${installment.label || 'installment'} of ${invoice.title}`;
            paymentMode = "installment";

            // Mark installment as PAYMENT_PENDING
            await db.invoiceInstallment.update({
                where: { id: installment.id },
                data: { status: 'PAYMENT_PENDING' }
            });
        }

        if (amountInCents < 50) {
            return NextResponse.json({ success: false, error: 'Payment amount must be at least $0.50' }, { status: 400 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://verihub.app';
        const businessName = invoice.user?.businessName || invoice.user?.name || 'Verihub User';

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: (invoice.currency || 'usd').toLowerCase(),
                        product_data: {
                            name: `Invoice ${invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ''}`,
                            description: invoice.title,
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            customer_email: invoice.clientEmail || undefined,
            metadata: {
                source: "invoice_payment",
                invoiceId: invoice.id,
                invoiceToken: token,
                ownerId: invoice.userId,
                paymentMode: paymentMode,
                installmentId: installmentId || "",
            },
            success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/invoice/${token}?payment=cancelled`,
        });

        // Track that payment is pending
        if (invoice.paymentStatus === 'UNPAID') {
            await db.invoice.update({
                where: { id: invoice.id },
                data: {
                    paymentStatus: 'PAYMENT_PENDING',
                    stripeCheckoutSessionId: session.id
                }
            });
        } else {
             await db.invoice.update({
                where: { id: invoice.id },
                data: {
                    stripeCheckoutSessionId: session.id
                }
            });
        }

        // Also track on installment if applicable
        if (installmentId) {
            await db.invoiceInstallment.update({
                where: { id: installmentId },
                data: { stripeCheckoutSessionId: session.id }
            });
        }

        return NextResponse.json({ success: true, url: session.url }, { status: 200 });

    } catch (error: any) {
        console.error('Checkout Session Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

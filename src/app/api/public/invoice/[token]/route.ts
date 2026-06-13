import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (rateLimit(ip, 20)) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { token } = await params;

        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { publicToken: token },
            include: { 
                items: true, 
                user: true,
                onlinePayments: {
                    select: {
                        id: true,
                        amount: true,
                        currency: true,
                        status: true,
                        paymentMethod: true,
                        payerName: true,
                        payerEmail: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' }
                },
                installments: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!invoice) {
            // Trigger 410 Gone generically to prevent timing enumeration
            return NextResponse.json({ success: false, error: 'Invoice not found or invalid URL' }, { status: 410 });
        }

        if (invoice.publicTokenExpiresAt && invoice.publicTokenExpiresAt < new Date()) {
            return NextResponse.json({ success: false, error: 'This invoice link has expired.' }, { status: 410 });
        }

        // Validate Status (Do not expose cancelled internal records)
        if (invoice.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'This invoice has been voided/cancelled' }, { status: 410 });
        }

        const globalBusiness = await prisma.businessProfile.findFirst();

        // Construct Safe Payload (Stripping userId and internal PII metadata)
        const safeInvoice = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientCompany: invoice.clientCompany,
            clientPhone: invoice.clientPhone,
            clientAddress: invoice.clientAddress,
            clientPropertyAddress: invoice.clientPropertyAddress,
            title: invoice.title,
            description: invoice.description,
            currency: invoice.currency,
            subtotal: invoice.subtotal,
            discountType: invoice.discountType,
            discountValue: invoice.discountValue,
            tax: invoice.tax,
            total: invoice.total,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            notes: invoice.notes,
            status: invoice.status,
            viewCount: invoice.viewCount,
            lastViewedAt: invoice.lastViewedAt,
            createdAt: invoice.createdAt,
            sentAt: invoice.sentAt,
            isConverted: invoice.isConverted,
            paymentConfirmed: invoice.paymentConfirmed,
            paymentConfirmedAt: invoice.paymentConfirmedAt,
            authorizedSignature: invoice.authorizedSignature,
            
            acceptOnlinePayment: invoice.acceptOnlinePayment && invoice.user?.connectChargesEnabled,
            paymentStatus: invoice.paymentStatus,
            amountPaid: invoice.amountPaid,
            remainingBalance: invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0)),
            convertedReceiptId: invoice.convertedReceiptId,
            
            publicToken: invoice.publicToken,
            ownerIsPro: (invoice.user?.plan === 'PRO' && invoice.user?.planStatus !== 'inactive') || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN',
            businessName: invoice.user?.businessName || invoice.user?.name || invoice.user?.email?.split('@')[0] || null,
            businessEmail: invoice.user?.email || null,
            businessPhone: invoice.user?.businessPhone || null,
            businessAddress: invoice.user?.businessAddress || null,
            businessLogoPath: (invoice.user?.plan === 'PRO' || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN') ? invoice.user.businessLogoPath : null,
            businessRegistrationNumber: invoice.user?.businessRegistrationNumber || null,
            attachedPhotos: invoice.attachedPhotos,
            depositAmount: invoice.depositAmount,
            paymentMethod: invoice.paymentMethod,
            payments: invoice.payments,
            onlinePayments: invoice.onlinePayments,
            paymentPlanEnabled: invoice.paymentPlanEnabled,
            installments: invoice.installments.map(i => ({
                id: i.id,
                label: i.label,
                amount: i.amount,
                dueDate: i.dueDate,
                status: i.status
            })),
            items: invoice.items.map(i => ({
                id: i.id,
                name: i.name,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                total: i.total
            }))
        };

        return NextResponse.json({ success: true, invoice: safeInvoice }, { status: 200 });

    } catch (error: any) {
        console.error('Public Invoice Fetch Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

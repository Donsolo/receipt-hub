import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // TODO (Future Discovery Expansions):
        // 1. Match by Network recipient userId (Connection)
        // 2. Match by CustomerContact relationship mapping
        // 3. Match by InvoicePaymentRequestLog recipientUserId
        // 4. Match by verified business/customer relationships

        const invoices = await db.invoice.findMany({
            where: {
                // Case-insensitive match on the authenticated user's email
                clientEmail: {
                    equals: user.email,
                    mode: 'insensitive'
                },
                // Exclude DRAFT invoices as they haven't been "sent" or finalized
                status: {
                    not: 'DRAFT'
                }
            },
            include: {
                user: {
                    select: {
                        name: true,
                        businessName: true,
                        businessLogoPath: true,
                        email: true
                    }
                },
                installments: {
                    orderBy: {
                        dueDate: 'asc'
                    }
                }
            },
            orderBy: [
                // We'll sort primary by due date for unpaid
                // But in prisma, we sort generally by createdAt or dueDate, and do finer sorting client-side if needed.
                { dueDate: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Structure for the client
        const structured = invoices.map(inv => {
            const senderName = inv.user.businessName || inv.user.name || inv.user.email || 'Unknown Business';
            
            // Re-calculate basic balance info safely
            const totalPaid = inv.amountPaid || 0;
            const remainingBalance = inv.remainingBalance ?? (inv.total - totalPaid);

            let displayStatus = inv.status.toString();
            let isOverdue = false;
            
            if (displayStatus !== 'PAID' && displayStatus !== 'CANCELLED') {
                if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
                    isOverdue = true;
                }
                if (totalPaid > 0 && remainingBalance > 0) {
                    displayStatus = 'PARTIAL';
                } else if (remainingBalance > 0) {
                    displayStatus = 'UNPAID';
                }
            }

            return {
                id: inv.id,
                publicToken: inv.publicToken,
                invoiceNumber: inv.invoiceNumber,
                title: inv.title,
                senderName,
                senderLogo: inv.user.businessLogoPath,
                total: inv.total,
                amountPaid: totalPaid,
                remainingBalance: Math.max(0, remainingBalance),
                currency: inv.currency,
                dueDate: inv.dueDate,
                issueDate: inv.issueDate,
                status: inv.status,
                paymentStatus: inv.paymentStatus,
                displayStatus,
                isOverdue,
                paymentPlanEnabled: inv.paymentPlanEnabled,
                installments: inv.installments,
                convertedReceiptId: inv.convertedReceiptId
            };
        });

        return NextResponse.json({ success: true, data: structured });

    } catch (error) {
        console.error('[GET /api/billing/incoming] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

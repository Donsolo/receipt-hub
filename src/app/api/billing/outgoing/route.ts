import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const invoices = await db.invoice.findMany({
            where: {
                userId: user.id,
                status: {
                    not: 'DRAFT'
                }
            },
            include: {
                installments: {
                    orderBy: {
                        dueDate: 'asc'
                    }
                }
            },
            orderBy: [
                { createdAt: 'desc' }
            ]
        });

        // Structure for the client
        const structured = invoices.map(inv => {
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
                clientName: inv.clientName,
                clientCompany: inv.clientCompany,
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
        console.error('[GET /api/billing/outgoing] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

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

        // Get installments for incoming invoices
        const incomingInvoices = await db.invoice.findMany({
            where: {
                clientEmail: {
                    equals: user.email,
                    mode: 'insensitive'
                },
                status: { not: 'DRAFT' },
                paymentPlanEnabled: true
            },
            include: {
                installments: {
                    orderBy: { dueDate: 'asc' }
                },
                user: {
                    select: { name: true, businessName: true }
                }
            }
        });

        // Get installments for outgoing invoices
        const outgoingInvoices = await db.invoice.findMany({
            where: {
                userId: user.id,
                status: { not: 'DRAFT' },
                paymentPlanEnabled: true
            },
            include: {
                installments: {
                    orderBy: { dueDate: 'asc' }
                }
            }
        });

        const incoming = incomingInvoices.flatMap(inv => 
            inv.installments.map(inst => ({
                ...inst,
                direction: 'incoming',
                invoiceTitle: inv.title,
                invoiceNumber: inv.invoiceNumber,
                invoiceToken: inv.publicToken,
                counterpartyName: inv.user.businessName || inv.user.name || 'Unknown',
                invoiceCurrency: inv.currency
            }))
        );

        const outgoing = outgoingInvoices.flatMap(inv => 
            inv.installments.map(inst => ({
                ...inst,
                direction: 'outgoing',
                invoiceTitle: inv.title,
                invoiceNumber: inv.invoiceNumber,
                invoiceToken: inv.publicToken,
                counterpartyName: inv.clientCompany || inv.clientName || 'Unknown',
                invoiceCurrency: inv.currency
            }))
        );

        // Merge and sort by due date
        const allInstallments = [...incoming, ...outgoing].sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        return NextResponse.json({ success: true, data: allInstallments });

    } catch (error) {
        console.error('[GET /api/billing/installments] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

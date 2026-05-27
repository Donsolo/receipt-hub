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

        // Get all incoming invoices that are not paid/cancelled/draft
        const incomingInvoices = await db.invoice.findMany({
            where: {
                clientEmail: {
                    equals: user.email,
                    mode: 'insensitive'
                },
                status: {
                    notIn: ['DRAFT', 'PAID', 'CANCELLED']
                }
            }
        });

        const outgoingInvoices = await db.invoice.findMany({
            where: {
                userId: user.id,
                status: {
                    notIn: ['DRAFT', 'PAID', 'CANCELLED']
                }
            }
        });

        // Calculate counts and balances
        let unpaidIncomingCount = 0;
        let incomingOutstandingBalance = 0;
        let overdueIncomingCount = 0;

        for (const inv of incomingInvoices) {
            const balance = inv.remainingBalance ?? (inv.total - (inv.amountPaid || 0));
            if (balance > 0) {
                unpaidIncomingCount++;
                incomingOutstandingBalance += balance;
                if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
                    overdueIncomingCount++;
                }
            }
        }

        let unpaidOutgoingCount = 0;
        let outgoingOutstandingBalance = 0;
        let overdueOutgoingCount = 0;

        for (const inv of outgoingInvoices) {
            const balance = inv.remainingBalance ?? (inv.total - (inv.amountPaid || 0));
            if (balance > 0) {
                unpaidOutgoingCount++;
                outgoingOutstandingBalance += balance;
                if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
                    overdueOutgoingCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                incoming: {
                    unpaidCount: unpaidIncomingCount,
                    overdueCount: overdueIncomingCount,
                    outstandingBalance: incomingOutstandingBalance
                },
                outgoing: {
                    unpaidCount: unpaidOutgoingCount,
                    overdueCount: overdueOutgoingCount,
                    outstandingBalance: outgoingOutstandingBalance
                }
            }
        });

    } catch (error) {
        console.error('[GET /api/billing/summary] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

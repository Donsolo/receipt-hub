import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { differenceInDays } from 'date-fns';
import { sendAgingDigestEmail } from '@/lib/emails/sendAgingDigestEmail';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET || process.env.INTERNAL_JOB_SECRET;

        if (!secret || authHeader !== `Bearer ${secret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create Job Run
        const jobRun = await db.internalJobRun.create({
            data: {
                jobName: 'invoice-aging-digest',
                status: 'STARTED'
            }
        });

        // Find all Pro users with aging digest enabled
        const proUsers = await db.user.findMany({
            where: {
                OR: [
                    { plan: 'PRO' },
                    { role: 'ADMIN' },
                    { role: 'SUPER_ADMIN' }
                ],
                agingDigestEnabled: true
            },
            select: { id: true, businessName: true, email: true, name: true }
        });

        if (proUsers.length === 0) {
            await db.internalJobRun.update({
                where: { id: jobRun.id },
                data: { status: 'SUCCEEDED', finishedAt: new Date(), errorMessage: 'No eligible Pro users found' }
            });
            return NextResponse.json({ success: true, processed: 0, message: 'No eligible Pro users found' });
        }

        let sentCount = 0;
        const today = new Date();

        for (const owner of proUsers) {
            const invoices = await db.invoice.findMany({
                where: {
                    userId: owner.id,
                    status: { in: ['SENT', 'VIEWED'] }
                },
                include: { installments: true }
            });

            let totalOutstanding = 0;
            let unpaidCount = 0;
            let partialCount = 0;
            
            const buckets = {
                current: 0,
                days1to15: 0,
                days16to30: 0,
                days31to60: 0,
                days60Plus: 0
            };

            const outstandingList: any[] = [];

            for (const inv of invoices) {
                const payments = Array.isArray(inv.payments) ? inv.payments as any[] : [];
                const totalPaidFromPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const totalPaidFromInstallments = inv.installments
                    .filter(i => i.status === 'PAID')
                    .reduce((sum, i) => sum + i.amount, 0);

                const amountPaid = Math.max(totalPaidFromPayments, totalPaidFromInstallments);
                const remainingBalance = Math.max(0, inv.total - amountPaid);

                if (remainingBalance <= 0) continue; // Paid

                totalOutstanding += remainingBalance;
                if (amountPaid > 0) partialCount++;
                else unpaidCount++;

                let daysOverdue = 0;
                if (inv.dueDate) {
                    daysOverdue = Math.max(0, differenceInDays(today, new Date(inv.dueDate)));
                    if (daysOverdue === 0) buckets.current += remainingBalance;
                    else if (daysOverdue <= 15) buckets.days1to15 += remainingBalance;
                    else if (daysOverdue <= 30) buckets.days16to30 += remainingBalance;
                    else if (daysOverdue <= 60) buckets.days31to60 += remainingBalance;
                    else buckets.days60Plus += remainingBalance;
                } else {
                    buckets.current += remainingBalance; // No due date, considered current
                }

                outstandingList.push({
                    invoiceNumber: inv.invoiceNumber || inv.id,
                    clientName: inv.clientName,
                    balance: remainingBalance,
                    daysOverdue
                });
            }

            if (totalOutstanding > 0) {
                // Get top 5 most overdue
                outstandingList.sort((a, b) => b.daysOverdue - a.daysOverdue);
                const topInvoices = outstandingList.slice(0, 5);

                await sendAgingDigestEmail({
                    to: owner.email,
                    ownerName: owner.name || owner.businessName || 'Owner',
                    totalOutstanding,
                    unpaidCount,
                    partialCount,
                    buckets,
                    topInvoices
                });
                
                sentCount++;
            }
        }

        await db.internalJobRun.update({
            where: { id: jobRun.id },
            data: {
                status: 'SUCCEEDED',
                finishedAt: new Date(),
                processedCount: proUsers.length,
                successCount: sentCount
            }
        });

        return NextResponse.json({ success: true, processed: proUsers.length, sentCount });

    } catch (error: any) {
        console.error('Invoice Aging Digest Cron Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

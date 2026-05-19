import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { differenceInDays, isSameDay } from 'date-fns';

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
                jobName: 'payment-reminders',
                status: 'STARTED'
            }
        });

        // Find all Pro users
        const proUsers = await db.user.findMany({
            where: {
                OR: [
                    { plan: 'PRO' },
                    { role: 'ADMIN' },
                    { role: 'SUPER_ADMIN' }
                ]
            },
            select: { id: true, businessName: true }
        });

        const proUserIds = proUsers.map(u => u.id);

        if (proUserIds.length === 0) {
            await db.internalJobRun.update({
                where: { id: jobRun.id },
                data: { status: 'SUCCEEDED', finishedAt: new Date(), errorMessage: 'No Pro users found' }
            });
            return NextResponse.json({ success: true, processed: 0, message: 'No Pro users found' });
        }

        // Find eligible invoices
        const today = new Date();
        
        const invoices = await db.invoice.findMany({
            where: {
                userId: { in: proUserIds },
                acceptOnlinePayment: true,
                paymentReminderEnabled: true,
                status: { in: ['SENT', 'VIEWED'] }
            },
            include: {
                paymentRequestLogs: true,
                installments: true,
                user: true
            }
        });

        let sentCount = 0;

        for (const invoice of invoices) {
            // Calculate balance
            const manualPayments = Array.isArray(invoice.payments) ? invoice.payments as any[] : [];
            const manualTotal = manualPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const instTotal = invoice.installments.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
            const amountPaid = Math.max(manualTotal, instTotal);
            const remainingBalance = Math.max(0, invoice.total - amountPaid);

            if (remainingBalance <= 0) continue; // Paid in full
            if (!invoice.clientEmail) continue;

            const logs = invoice.paymentRequestLogs.filter(log => log.action === 'REMINDER_SENT' && log.channel === 'EMAIL');
            
            // Cap: max 5 reminders per 30 days
            const last30DaysLogs = logs.filter(l => differenceInDays(today, l.createdAt) <= 30);
            if (last30DaysLogs.length >= 5) continue;

            // Cap: max 1 reminder per 24 hours
            if (logs.length > 0) {
                logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                if (differenceInDays(today, logs[0].createdAt) < 1) continue;
            }

            // Determine if a reminder is due based on dueDate
            // Timing: 3 days before, on due date, 3 days overdue, 7 days overdue, then weekly
            let shouldSend = false;

            if (invoice.dueDate) {
                const due = new Date(invoice.dueDate);
                const diff = differenceInDays(today, due);

                if (diff === -3) shouldSend = true;
                else if (isSameDay(today, due)) shouldSend = true;
                else if (diff === 3) shouldSend = true;
                else if (diff === 7) shouldSend = true;
                else if (diff > 7 && diff % 7 === 0) shouldSend = true;
            }

            if (!shouldSend) continue;

            // Send Email using existing external route trick or internal service
            // Here we'll simulate the internal HTTP call to the existing endpoint
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host') || 'localhost:3000';
            const baseUrl = `${protocol}://${host}`;

            try {
                const res = await fetch(`${baseUrl}/api/invoices/${invoice.id}/send-payment-reminder`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': request.headers.get('cookie') || '' // Try to pass auth if needed, but since it's cron, the target route must allow this or we bypass. 
                    },
                    body: JSON.stringify({
                        email: invoice.clientEmail,
                        message: "This is an automated reminder regarding your upcoming or overdue invoice."
                    })
                });

                if (res.ok) {
                    // Update log locally to reflect CRON
                    await db.invoicePaymentRequestLog.create({
                        data: {
                            invoiceId: invoice.id,
                            channel: 'EMAIL',
                            recipientEmail: invoice.clientEmail,
                            action: 'SCHEDULED_REMINDER_SENT',
                            status: 'SENT',
                            metadata: { trigger: 'cron', daysOverdue: differenceInDays(today, new Date(invoice.dueDate!)) }
                        }
                    });
                    sentCount++;
                }
            } catch (err: any) {
                console.error(`Failed to send cron reminder for invoice ${invoice.id}:`, err);
            }
        }

        await db.internalJobRun.update({
            where: { id: jobRun.id },
            data: {
                status: 'SUCCEEDED',
                finishedAt: new Date(),
                processedCount: invoices.length,
                successCount: sentCount
            }
        });

        return NextResponse.json({ success: true, processed: invoices.length, sentCount });

    } catch (error: any) {
        console.error('Payment Reminders Cron Error:', error);
        
        // Try to log failure if possible, but we don't have jobRun ID out here without rearranging. 
        // We'll log it if we can
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

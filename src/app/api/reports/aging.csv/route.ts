import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { differenceInDays, format } from 'date-fns';

function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    
    let safeStr = str;
    if (safeStr.startsWith('=') || safeStr.startsWith('+') || safeStr.startsWith('-') || safeStr.startsWith('@')) {
        safeStr = "'" + safeStr;
    }

    if (safeStr.includes(',') || safeStr.includes('"') || safeStr.includes('\n')) {
        return `"${safeStr.replace(/"/g, '""')}"`;
    }
    return safeStr;
}

export async function GET(request: Request) {
    try {
        const token = (request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0] || (request.headers.get('authorization')?.startsWith('Bearer ') ? request.headers.get('authorization')?.substring(7) : undefined));
        if (!token) return new NextResponse('Unauthorized', { status: 401 });

        const user = await verifyToken(token);
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const owner = await db.user.findUnique({ where: { id: user.userId } });
        const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';
        if (!isPro) return new NextResponse('Pro feature only.', { status: 403 });

        const invoices = await db.invoice.findMany({
            where: {
                userId: user.userId,
                status: { in: ['SENT', 'VIEWED'] }
            },
            include: { installments: true, paymentRequestLogs: true }
        });

        const headers = [
            'Invoice Number',
            'Customer Name',
            'Customer Email',
            'Total',
            'Amount Paid',
            'Remaining Balance',
            'Due Date',
            'Days Overdue',
            'Aging Bucket',
            'Last Reminder Sent',
            'Reminder Count'
        ];

        const rows: any[][] = [];
        const today = new Date();

        invoices.forEach(inv => {
            const payments = Array.isArray(inv.payments) ? inv.payments as any[] : [];
            const totalPaidFromPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            
            const totalPaidFromInstallments = inv.installments
                .filter(i => i.status === 'PAID')
                .reduce((sum, i) => sum + i.amount, 0);

            const amountPaid = Math.max(totalPaidFromPayments, totalPaidFromInstallments);
            const remainingBalance = Math.max(0, inv.total - amountPaid);
            
            if (remainingBalance <= 0) return; // Only show outstanding debt

            let daysOverdue = 0;
            let bucket = 'No Due Date';

            if (inv.dueDate) {
                daysOverdue = Math.max(0, differenceInDays(today, new Date(inv.dueDate)));
                if (daysOverdue === 0) bucket = 'Current';
                else if (daysOverdue <= 15) bucket = '1-15 days';
                else if (daysOverdue <= 30) bucket = '16-30 days';
                else if (daysOverdue <= 60) bucket = '31-60 days';
                else bucket = '60+ days';
            }

            const reminders = inv.paymentRequestLogs.filter(log => log.action === 'REMINDER_SENT');
            const reminderCount = reminders.length;
            
            let lastReminderDate = '';
            if (reminderCount > 0) {
                reminders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                lastReminderDate = format(reminders[0].createdAt, 'yyyy-MM-dd HH:mm');
            }

            rows.push([
                inv.invoiceNumber || inv.id,
                inv.clientName,
                inv.clientEmail || '',
                inv.total.toFixed(2),
                amountPaid.toFixed(2),
                remainingBalance.toFixed(2),
                inv.dueDate ? format(inv.dueDate, 'yyyy-MM-dd') : '',
                inv.dueDate ? daysOverdue : '',
                bucket,
                lastReminderDate,
                reminderCount
            ]);
        });

        // Sort by days overdue descending
        rows.sort((a, b) => (b[7] || 0) - (a[7] || 0));

        const csvContent = [
            headers.map(escapeCsv).join(','),
            ...rows.map(row => row.map(escapeCsv).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="verihub-aging.csv"'
            }
        });

    } catch (error) {
        console.error('CSV Export Error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

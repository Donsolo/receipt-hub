import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { format } from 'date-fns';

function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    
    // Prevent CSV formula injection
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

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const statusParam = searchParams.get('status');

        const where: any = { userId: user.userId };
        
        if (from || to) {
            where.issueDate = {};
            if (from) where.issueDate.gte = new Date(from);
            if (to) where.issueDate.lte = new Date(to);
        }

        if (statusParam) {
            where.status = statusParam;
        }

        const invoices = await db.invoice.findMany({
            where,
            include: { installments: true },
            orderBy: { issueDate: 'desc' }
        });

        const headers = [
            'Invoice Number',
            'Customer Name',
            'Customer Email',
            'Status',
            'Payment Status',
            'Total',
            'Amount Paid',
            'Remaining Balance',
            'Due Date',
            'Created Date',
            'Last Payment Date',
            'Payment Plan Enabled'
        ];

        const rows = invoices.map(inv => {
            const payments = Array.isArray(inv.payments) ? inv.payments as any[] : [];
            const totalPaidFromPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            
            const totalPaidFromInstallments = inv.installments
                .filter(i => i.status === 'PAID')
                .reduce((sum, i) => sum + i.amount, 0);

            const amountPaid = Math.max(totalPaidFromPayments, totalPaidFromInstallments);
            const remainingBalance = Math.max(0, inv.total - amountPaid);
            
            let paymentStatus = 'UNPAID';
            if (remainingBalance === 0) paymentStatus = 'PAID';
            else if (amountPaid > 0) paymentStatus = 'PARTIAL';

            // Find last payment date
            let lastPaymentDate = '';
            const allPaymentDates: Date[] = [];
            payments.forEach(p => { if (p.date) allPaymentDates.push(new Date(p.date)); });
            inv.installments.forEach(i => { if (i.paidAt) allPaymentDates.push(i.paidAt); });
            
            if (allPaymentDates.length > 0) {
                allPaymentDates.sort((a, b) => b.getTime() - a.getTime());
                lastPaymentDate = format(allPaymentDates[0], 'yyyy-MM-dd');
            }

            return [
                inv.invoiceNumber || inv.id,
                inv.clientName,
                inv.clientEmail,
                inv.status,
                paymentStatus,
                inv.total.toFixed(2),
                amountPaid.toFixed(2),
                remainingBalance.toFixed(2),
                inv.dueDate ? format(inv.dueDate, 'yyyy-MM-dd') : '',
                format(inv.createdAt, 'yyyy-MM-dd'),
                lastPaymentDate,
                inv.acceptOnlinePayment ? 'Yes' : 'No'
            ];
        });

        const csvContent = [
            headers.map(escapeCsv).join(','),
            ...rows.map(row => row.map(escapeCsv).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="verihub-invoices.csv"'
            }
        });

    } catch (error) {
        console.error('CSV Export Error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

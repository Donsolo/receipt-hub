import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { format } from 'date-fns';

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
            where: { userId: user.userId },
            include: { installments: true },
            orderBy: { issueDate: 'desc' }
        });

        const headers = [
            'Invoice Number',
            'Payment Date',
            'Amount',
            'Status',
            'Method',
            'Payer Name',
            'Payer Email',
            'Stripe Reference',
            'Installment Label'
        ];

        const rows: any[][] = [];

        invoices.forEach(inv => {
            // Extract manual payments
            const manualPayments = Array.isArray(inv.payments) ? inv.payments as any[] : [];
            manualPayments.forEach(p => {
                rows.push([
                    inv.invoiceNumber || inv.id,
                    p.date ? format(new Date(p.date), 'yyyy-MM-dd') : '',
                    Number(p.amount || 0).toFixed(2),
                    'PAID (MANUAL)',
                    p.method || 'Manual',
                    inv.clientName,
                    inv.clientEmail || '',
                    '',
                    p.note || ''
                ]);
            });

            // Extract online installment payments
            inv.installments.forEach(inst => {
                if (inst.status === 'PAID') {
                    rows.push([
                        inv.invoiceNumber || inv.id,
                        inst.paidAt ? format(inst.paidAt, 'yyyy-MM-dd') : '',
                        inst.amount.toFixed(2),
                        'PAID (ONLINE)',
                        'Credit Card',
                        inv.clientName,
                        inv.clientEmail || '',
                        inst.stripePaymentIntentId ? `...${inst.stripePaymentIntentId.slice(-6)}` : '',
                        inst.label || 'Online Payment'
                    ]);
                }
            });
        });

        // Sort rows by date descending
        rows.sort((a, b) => {
            const dateA = new Date(a[1] || 0).getTime();
            const dateB = new Date(b[1] || 0).getTime();
            return dateB - dateA;
        });

        const csvContent = [
            headers.map(escapeCsv).join(','),
            ...rows.map(row => row.map(escapeCsv).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="verihub-payments.csv"'
            }
        });

    } catch (error) {
        console.error('CSV Export Error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

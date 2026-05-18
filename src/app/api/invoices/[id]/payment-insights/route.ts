import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const invoice = await db.invoice.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                status: true,
                paymentStatus: true,
                amountPaid: true,
                remainingBalance: true,
                total: true,
                viewCount: true,
                lastViewedAt: true,
                paymentReminderCount: true,
                lastPaymentReminderAt: true,
                user: { select: { plan: true, role: true } }
            }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const isPro = (invoice.user?.plan === 'PRO' && invoice.user?.planStatus !== 'inactive') || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Insights are a Pro feature.' }, { status: 403 });
        }

        const events = await db.invoicePaymentAnalyticsEvent.findMany({
            where: { invoiceId: id }
        });

        const insights = {
            totalViews: invoice.viewCount || 0,
            portalViews: events.filter(e => e.eventType === 'PORTAL_VIEW').length,
            ctaClicks: events.filter(e => e.eventType === 'PAYMENT_CTA_CLICK' || e.eventType === 'INSTALLMENT_CTA_CLICK').length,
            bundleViews: events.filter(e => e.eventType === 'BUNDLE_VIEW').length,
            lastViewedAt: invoice.lastViewedAt,
            reminderCount: invoice.paymentReminderCount || 0,
            lastReminderAt: invoice.lastPaymentReminderAt,
            remainingBalance: invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0)),
            status: invoice.status,
            conversionState: 'UNSEEN'
        };

        if (invoice.status === 'PAID' || invoice.paymentStatus === 'PAID') {
            insights.conversionState = 'PAID';
        } else if ((invoice.amountPaid || 0) > 0) {
            insights.conversionState = 'PARTIAL_PAID';
        } else if (insights.ctaClicks > 0) {
            insights.conversionState = 'CLICKED_UNPAID';
        } else if (insights.totalViews > 0 || insights.portalViews > 0) {
            insights.conversionState = 'VIEWED_UNPAID';
        }

        return NextResponse.json({ success: true, insights });
    } catch (error) {
        console.error('Insights API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

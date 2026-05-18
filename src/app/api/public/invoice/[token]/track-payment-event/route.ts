import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        
        // Find invoice safely
        const invoice = await db.invoice.findUnique({
            where: { publicToken: token },
            select: { id: true, userId: true, user: { select: { plan: true, role: true } } }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Only track for Pro/Admin owners
        const isPro = invoice.user?.plan === 'PRO' || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ success: true, ignored: true }); // Silently ignore for free tier
        }

        const body = await request.json();
        const { eventType, channel, installmentId, requestLogId, metadata } = body;

        // Whitelist event types
        const validEvents = ['PORTAL_VIEW', 'PAYMENT_CTA_CLICK', 'INSTALLMENT_CTA_CLICK', 'INVOICE_VIEW', 'BUNDLE_VIEW'];
        if (!validEvents.includes(eventType)) {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        // Basic Rate Limiting / Spam prevention: 
        // Max 50 events per IP hash per day per invoice
        const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const referrer = request.headers.get('referer') || 'unknown';

        let ipHash = null;
        if (rawIp !== 'unknown') {
            // Hash the IP with a secret salt so raw IP is never stored
            const salt = process.env.NEXTAUTH_SECRET || 'fallback_salt';
            ipHash = crypto.createHash('sha256').update(rawIp + salt).digest('hex');
        }

        if (ipHash) {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentEvents = await db.invoicePaymentAnalyticsEvent.count({
                where: {
                    invoiceId: invoice.id,
                    ipHash,
                    createdAt: { gte: oneDayAgo }
                }
            });

            if (recentEvents > 50) {
                return NextResponse.json({ success: true, ignored: true, reason: 'rate_limited' });
            }
        }

        await db.invoicePaymentAnalyticsEvent.create({
            data: {
                invoiceId: invoice.id,
                eventType,
                channel: channel || null,
                installmentId: installmentId || null,
                requestLogId: requestLogId || null,
                userAgent: userAgent.substring(0, 255), // Truncate safely
                ipHash,
                referrer: referrer.substring(0, 255),
                metadata: metadata || {}
            }
        });

        // Also update the invoice view count implicitly if it's a view event
        if (eventType === 'PORTAL_VIEW' || eventType === 'INVOICE_VIEW') {
            await db.invoice.update({
                where: { id: invoice.id },
                data: {
                    viewCount: { increment: 1 },
                    lastViewedAt: new Date()
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        // Never break the caller on analytics failure
        console.error('Failed to track payment event:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

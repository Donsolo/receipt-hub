import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        // Relaxed rate limit for tracking
        if (rateLimit(ip, 50)) {
            return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 });
        }

        const resolvedParams = await params;
        const token = resolvedParams.token;

        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        // Fetch invoice with minimal fields
        const invoice = await prisma.invoice.findUnique({
            where: { publicToken: token },
            select: { id: true, status: true }
        });

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }

        const canUpgradeToViewed = invoice.status === 'SENT' || invoice.status === 'DRAFT';

        // Perform atomic update for tracking
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                viewCount: { increment: 1 },
                lastViewedAt: new Date(),
                // Progress status only if currently DRAFT or SENT
                ...(canUpgradeToViewed ? { status: 'VIEWED' } : {})
            }
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('Invoice Tracking Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

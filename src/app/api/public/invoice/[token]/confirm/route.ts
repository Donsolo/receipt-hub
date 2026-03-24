import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (rateLimit(ip, 15)) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { token } = await params;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        const body = await req.json();
        const { signature, isInitials } = body;

        if (!signature || signature.trim() === '') {
            return NextResponse.json({ success: false, error: 'A valid signature or initial is required to confirm.' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { publicToken: token }
        });

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found or invalid URL' }, { status: 404 });
        }

        if (invoice.publicTokenExpiresAt && invoice.publicTokenExpiresAt < new Date()) {
            return NextResponse.json({ success: false, error: 'This invoice link has expired.' }, { status: 410 });
        }

        if (invoice.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'Cannot sign a cancelled invoice.' }, { status: 410 });
        }

        if (invoice.status === 'PAID' || invoice.paymentConfirmed) {
            // Idempotent: If already paid or confirmed, just return success
            return NextResponse.json({ success: true, paymentConfirmed: true }, { status: 200 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'PAID',
                paymentConfirmed: true,
                paymentConfirmedAt: new Date(),
                paymentSignature: signature,
                paymentMethodNote: isInitials ? 'TEXT_INITIALS' : 'CANVAS_SIGNATURE'
            }
        });

        return NextResponse.json({ success: true, paymentConfirmed: updatedInvoice.paymentConfirmed }, { status: 200 });

    } catch (error: any) {
        console.error('Public Invoice Confirm Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

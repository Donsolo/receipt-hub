import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';
import { sendQuoteShareEmail } from '@/lib/vero-lens/email/sendQuoteShareEmail';

export async function POST(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id },
            include: { user: true }
        });

        if (!session) return new NextResponse('Not Found', { status: 404 });

        const body = await request.json();
        const { allowApproval = true, allowSignature = true, expiresAt, customerEmail } = body;

        // Revoke any existing active shares for this session to ensure only one active share link exists
        await db.veroLensShare.updateMany({
            where: { sessionId: id, status: 'ACTIVE' },
            data: { status: 'REVOKED' }
        });

        const token = crypto.randomBytes(24).toString('hex');

        const share = await db.veroLensShare.create({
            data: {
                sessionId: id,
                token,
                allowApproval,
                allowSignature,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                status: 'ACTIVE'
            }
        });

        let emailSent = false;
        if (customerEmail && process.env.NEXT_PUBLIC_BASE_URL) {
            const businessName = session.user.businessName || session.user.name || 'Service Estimate';
            const quoteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${token}`;
            emailSent = await sendQuoteShareEmail(customerEmail, businessName, quoteLink);
            
            if (!emailSent) {
                // If email fails, return error but keep share active so it can be copied.
                return NextResponse.json({ error: 'Failed to send email. Link was generated but email could not be delivered.', share }, { status: 500 });
            }
        }

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'QUOTE_SHARED',
                message: customerEmail ? `Quote link generated and emailed to ${customerEmail}.` : 'A secure share link was generated.'
            }
        });

        return NextResponse.json(share);
    } catch (error) {
        console.error('[VERO_LENS_SHARE_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id }
        });

        if (!session) return new NextResponse('Not Found', { status: 404 });

        await db.veroLensShare.updateMany({
            where: { sessionId: id, status: 'ACTIVE' },
            data: { status: 'REVOKED' }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'SHARE_REVOKED',
                message: 'Share link was revoked.'
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[VERO_LENS_SHARE_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

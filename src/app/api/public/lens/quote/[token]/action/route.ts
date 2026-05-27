import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendQuoteApprovedNotification } from '@/lib/vero-lens/email/sendQuoteApprovedNotification';
import { sendQuoteRejectedNotification } from '@/lib/vero-lens/email/sendQuoteRejectedNotification';
import { sendRevisionRequestNotification } from '@/lib/vero-lens/email/sendRevisionRequestNotification';

export async function POST(request: Request, context: any) {
    const { token } = await Promise.resolve(context.params);

    try {
        const body = await request.json();
        const { action, customerName, customerEmail, message, signatureDataUrl } = body;

        const share = await db.veroLensShare.findUnique({
            where: { token },
            include: { 
                session: {
                    include: { user: true }
                }
            }
        });

        if (!share) return new NextResponse('Invalid or Expired Link', { status: 404 });
        if (share.status === 'REVOKED') return new NextResponse('Link Revoked', { status: 403 });
        if (share.expiresAt && new Date() > share.expiresAt) return new NextResponse('Link Expired', { status: 403 });
        if (share.approvedAt || share.rejectedAt) return new NextResponse('Quote already processed', { status: 400 });
        if (!share.allowApproval) return new NextResponse('Approval not allowed on this link', { status: 403 });

        if (action === 'approve') {
            if (share.allowSignature && !signatureDataUrl) {
                return new NextResponse('Signature required', { status: 400 });
            }

            // Validate signature
            if (signatureDataUrl) {
                if (!signatureDataUrl.startsWith('data:image/png;base64,')) {
                    return new NextResponse('Invalid signature format', { status: 400 });
                }
                if (signatureDataUrl.length > 500000) { // ~500kb max
                    return new NextResponse('Signature too large', { status: 413 });
                }
            }

            await db.$transaction(async (tx) => {
                await tx.veroLensApproval.create({
                    data: {
                        sessionId: share.sessionId,
                        shareId: share.id,
                        versionId: share.session.activeVersionId,
                        customerName: customerName?.substring(0, 100),
                        customerEmail: customerEmail?.substring(0, 100),
                        message: message?.substring(0, 1000),
                        signatureDataUrl: signatureDataUrl || null,
                        status: 'APPROVED',
                        approvedAt: new Date()
                    }
                });

                await tx.veroLensShare.update({
                    where: { id: share.id },
                    data: { approvedAt: new Date(), status: 'APPROVED' }
                });

                await tx.veroLensEvent.create({
                    data: {
                        sessionId: share.sessionId,
                        type: share.session.activeVersionId ? 'VERSION_APPROVED' : 'QUOTE_APPROVED',
                        message: share.session.activeVersionId ? `Version approved by ${customerName || 'customer'}.` : `Quote was approved by ${customerName || 'customer'}.`
                    }
                });

                if (signatureDataUrl) {
                    await tx.veroLensEvent.create({
                        data: {
                            sessionId: share.sessionId,
                            type: 'SIGNATURE_CAPTURED',
                            message: `Signature captured.`
                        }
                    });
                }
            });

            const ownerEmail = share.session.user.email;
            if (ownerEmail && process.env.NEXT_PUBLIC_BASE_URL) {
                const businessName = share.session.user.businessName || share.session.user.name || 'Your Business';
                sendQuoteApprovedNotification(ownerEmail, businessName, `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${token}`, customerName || 'Customer')
                    .catch(err => console.error('Failed to send approve email', err));
            }

            return NextResponse.json({ success: true, status: 'APPROVED' });

        } else if (action === 'reject') {
            await db.$transaction(async (tx) => {
                await tx.veroLensApproval.create({
                    data: {
                        sessionId: share.sessionId,
                        shareId: share.id,
                        versionId: share.session.activeVersionId,
                        customerName: customerName?.substring(0, 100),
                        customerEmail: customerEmail?.substring(0, 100),
                        message: message?.substring(0, 1000),
                        status: 'REJECTED',
                        rejectedAt: new Date()
                    }
                });

                await tx.veroLensShare.update({
                    where: { id: share.id },
                    data: { rejectedAt: new Date(), status: 'REJECTED' }
                });

                await tx.veroLensEvent.create({
                    data: {
                        sessionId: share.sessionId,
                        type: share.session.activeVersionId ? 'VERSION_REJECTED' : 'QUOTE_REJECTED',
                        message: share.session.activeVersionId ? `Version rejected by ${customerName || 'customer'}.` : `Quote was rejected by ${customerName || 'customer'}.`
                    }
                });
            });

            const ownerEmail = share.session.user.email;
            if (ownerEmail && process.env.NEXT_PUBLIC_BASE_URL) {
                const businessName = share.session.user.businessName || share.session.user.name || 'Your Business';
                sendQuoteRejectedNotification(ownerEmail, businessName, `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${token}`, customerName || 'Customer', message)
                    .catch(err => console.error('Failed to send reject email', err));
            }

            return NextResponse.json({ success: true, status: 'REJECTED' });
        } else if (action === 'revision') {
            if (!message || message.trim().length === 0) {
                return new NextResponse('Revision request requires a message', { status: 400 });
            }

            await db.$transaction(async (tx) => {
                await tx.veroLensRevisionRequest.create({
                    data: {
                        sessionId: share.sessionId,
                        customerName: customerName?.substring(0, 100),
                        customerEmail: customerEmail?.substring(0, 100),
                        message: message.substring(0, 2000),
                    }
                });

                await tx.veroLensEvent.create({
                    data: {
                        sessionId: share.sessionId,
                        type: 'QUOTE_REVISION_REQUESTED',
                        message: `${customerName || 'Customer'} requested a revision.`
                    }
                });
            });

            const ownerEmail = share.session.user.email;
            if (ownerEmail && process.env.NEXT_PUBLIC_BASE_URL) {
                const businessName = share.session.user.businessName || share.session.user.name || 'Your Business';
                sendRevisionRequestNotification(ownerEmail, businessName, `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${token}`, message, customerName || 'Customer')
                    .catch(err => console.error('Failed to send revision email', err));
            }

            return NextResponse.json({ success: true, status: 'REVISION_REQUESTED' });
        } else {
            return new NextResponse('Invalid action', { status: 400 });
        }
    } catch (error) {
        console.error('[PUBLIC_QUOTE_ACTION]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

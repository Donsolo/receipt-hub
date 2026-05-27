import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, context: any) {
    const { token } = await Promise.resolve(context.params);

    try {
        const share = await db.veroLensShare.findUnique({
            where: { token },
            include: {
                session: {
                    include: {
                        images: {
                            select: {
                                id: true,
                                imageUrl: true,
                                annotations: true
                            }
                        },
                        lineItems: {
                            where: { quantity: { gt: 0 } },
                            orderBy: { sortOrder: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                quantity: true,
                                unit: true,
                                unitPrice: true,
                                estimatedPriceLow: true,
                                estimatedPriceHigh: true
                            }
                        },
                        user: {
                            select: {
                                businessName: true,
                                businessAddress: true,
                                businessPhone: true,
                                businessLogoPath: true,
                                email: true,
                                name: true
                            }
                        },
                        versions: {
                            orderBy: { versionNumber: 'desc' },
                            select: {
                                id: true,
                                versionNumber: true,
                                changeSummary: true,
                                createdAt: true,
                                snapshotJson: true
                            }
                        }
                    }
                }
            }
        });

        if (!share) {
            return new NextResponse('Invalid or Expired Link', { status: 404 });
        }

        if (share.status === 'REVOKED') {
            return new NextResponse('Link Revoked', { status: 403 });
        }

        if (share.expiresAt && new Date() > share.expiresAt) {
            return new NextResponse('Link Expired', { status: 403 });
        }

        // Track view
        const now = new Date();
        const timeSinceLastView = share.lastViewedAt ? now.getTime() - new Date(share.lastViewedAt).getTime() : Infinity;
        
        // Debounce: only track if it's the first view or > 5 minutes since last view
        if (timeSinceLastView > 5 * 60 * 1000) {
            await db.veroLensShare.update({
                where: { id: share.id },
                data: {
                    viewedAt: share.viewedAt || now,
                    firstViewedAt: share.firstViewedAt || now,
                    lastViewedAt: now,
                    totalViews: { increment: 1 }
                }
            });

            await db.veroLensEvent.create({
                data: {
                    sessionId: share.sessionId,
                    type: !share.firstViewedAt ? 'QUOTE_VIEWED' : 'QUOTE_REOPENED',
                    message: !share.firstViewedAt ? 'Customer viewed the quote for the first time.' : 'Customer re-opened the quote.'
                }
            });
        }

        const session = share.session;
        let activeVersion = null;
        if (session.activeVersionId) {
            activeVersion = session.versions.find(v => v.id === session.activeVersionId);
        }

        // Build safe payload
        // If we have an active version, use its snapshot. Otherwise fallback to live session data.
        const presentationData: any = activeVersion ? activeVersion.snapshotJson : {
            title: session.title,
            serviceCategory: session.serviceCategory,
            disclaimer: session.disclaimer,
            images: session.images,
            lineItems: session.lineItems
        };

        const safePayload = {
            id: session.id,
            title: presentationData.metadata?.title || presentationData.title || session.title,
            serviceCategory: presentationData.metadata?.serviceCategory || presentationData.serviceCategory || session.serviceCategory,
            createdAt: session.createdAt,
            disclaimer: presentationData.metadata?.disclaimer || presentationData.disclaimer || session.disclaimer,
            images: presentationData.images || session.images,
            lineItems: presentationData.lineItems || session.lineItems,
            business: session.user,
            share: {
                id: share.id,
                allowApproval: share.allowApproval,
                allowSignature: share.allowSignature,
                status: share.status,
                approvedAt: share.approvedAt,
                rejectedAt: share.rejectedAt
            },
            version: activeVersion ? {
                id: activeVersion.id,
                versionNumber: activeVersion.versionNumber,
                changeSummary: activeVersion.changeSummary,
                createdAt: activeVersion.createdAt
            } : null,
            history: session.versions.map(v => ({
                versionNumber: v.versionNumber,
                changeSummary: v.changeSummary,
                createdAt: v.createdAt
            }))
        };

        return NextResponse.json(safePayload);
    } catch (error) {
        console.error('[PUBLIC_QUOTE_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

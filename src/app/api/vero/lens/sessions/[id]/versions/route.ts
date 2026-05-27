import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id },
            include: {
                versions: {
                    orderBy: { versionNumber: 'desc' }
                }
            }
        });

        if (!session) return new NextResponse('Not Found', { status: 404 });

        return NextResponse.json(session.versions);
    } catch (error) {
        console.error('[VERO_LENS_VERSIONS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id },
            include: {
                lineItems: { orderBy: { sortOrder: 'asc' } },
                images: true,
                questions: true,
                versions: true
            }
        });

        if (!session) return new NextResponse('Not Found', { status: 404 });

        const body = await request.json();
        const { changeSummary } = body;

        if (!changeSummary || changeSummary.trim().length === 0) {
            return new NextResponse('Change summary is required', { status: 400 });
        }

        const nextVersionNumber = session.versions.length + 1;

        // Build the snapshot
        const snapshot = {
            metadata: {
                title: session.title,
                serviceCategory: session.serviceCategory,
                tradeMode: session.tradeMode,
                aiModel: session.aiModel,
                aiProvider: session.aiProvider,
                confidenceScore: session.confidenceScore,
                disclaimer: session.disclaimer
            },
            lineItems: session.lineItems.map(li => ({
                title: li.title,
                description: li.description,
                quantity: li.quantity,
                unit: li.unit,
                unitPrice: li.unitPrice,
                estimatedPriceLow: li.estimatedPriceLow,
                estimatedPriceHigh: li.estimatedPriceHigh,
                confidence: li.confidence
            })),
            images: session.images.map(img => ({
                id: img.id,
                imageUrl: img.imageUrl,
                annotations: img.annotations
            })),
            questions: session.questions.map(q => ({
                question: q.question,
                answer: q.answer
            }))
        };

        const newVersion = await db.$transaction(async (tx) => {
            const version = await tx.veroLensVersion.create({
                data: {
                    sessionId: session.id,
                    versionNumber: nextVersionNumber,
                    title: session.title,
                    changeSummary,
                    createdByUserId: user.id,
                    snapshotJson: snapshot,
                    status: 'ACTIVE'
                }
            });

            // If there's an existing active version, mark it superseded (optional, we use activeVersionId primarily)
            // But let's just update the session
            await tx.veroLensSession.update({
                where: { id: session.id },
                data: { activeVersionId: version.id }
            });

            await tx.veroLensEvent.create({
                data: {
                    sessionId: session.id,
                    type: nextVersionNumber === 1 ? 'VERSION_CREATED' : 'VERSION_SUPERSEDED',
                    message: `Version ${nextVersionNumber} created: ${changeSummary}`
                }
            });

            return version;
        });

        return NextResponse.json(newVersion);
    } catch (error) {
        console.error('[VERO_LENS_VERSIONS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

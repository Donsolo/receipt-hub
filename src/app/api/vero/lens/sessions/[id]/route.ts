import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, context: any) {
    // Next.js 15 requires awaiting params
    const { id } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const session = await db.veroLensSession.findUnique({
            where: {
                id,
                userId: user.id
            },
            include: {
                images: true,
                detections: true,
                lineItems: {
                    orderBy: {
                        sortOrder: 'asc'
                    }
                },
                questions: true,
                events: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                shares: {
                    where: { status: 'ACTIVE' }
                },
                approvals: true
            }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error('[VERO_LENS_SESSION_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { title, serviceCategory, tradeMode, status } = body;

        // Ensure ownership
        const existingSession = await db.veroLensSession.findUnique({
            where: { id, userId: user.id }
        });

        if (!existingSession) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const updatedSession = await db.veroLensSession.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(serviceCategory !== undefined && { serviceCategory }),
                ...(tradeMode !== undefined && { tradeMode }),
                ...(status !== undefined && { status }),
            }
        });

        if (status === 'SAVED') {
            await db.veroLensEvent.create({
                data: {
                    sessionId: id,
                    type: 'DRAFT_SAVED',
                    message: 'Draft estimate was saved.'
                }
            });
        }

        return NextResponse.json(updatedSession);
    } catch (error) {
        console.error('[VERO_LENS_SESSION_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

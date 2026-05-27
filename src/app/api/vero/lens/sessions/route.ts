import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const sessions = await db.veroLensSession.findMany({
            where: {
                userId: user.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(sessions);
    } catch (error) {
        console.error('[VERO_LENS_SESSIONS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { tradeMode } = body;

        const session = await db.veroLensSession.create({
            data: {
                userId: user.id,
                tradeMode: tradeMode || 'general',
                status: 'DRAFT',
            }
        });

        // Add an event for creation
        await db.veroLensEvent.create({
            data: {
                sessionId: session.id,
                type: 'SESSION_CREATED',
                message: 'Vero Lens session started.'
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error('[VERO_LENS_SESSIONS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

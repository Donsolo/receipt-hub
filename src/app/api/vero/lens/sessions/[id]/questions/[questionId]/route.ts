import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: Request, context: any) {
    const { id, questionId } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const body = await request.json();
        const { answer } = body;

        const updated = await db.veroLensQuestion.update({
            where: { id: questionId, sessionId: id },
            data: { answer }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'QUESTION_ANSWERED',
                message: 'A follow-up question was answered.'
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('[VERO_LENS_QUESTION_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

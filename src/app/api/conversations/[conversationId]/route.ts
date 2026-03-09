import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
    request: Request,
    { params }: { params: { conversationId: string } }
) {
    try {
        const { conversationId } = params;
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action'); // 'clear' or 'delete'

        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify the user is a participant
        const participant = await db.conversationParticipant.findFirst({
            where: {
                conversationId,
                userId: user.userId
            }
        });

        if (!participant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (action === 'clear') {
            // Delete all messages in the conversation
            await db.message.deleteMany({
                where: { conversationId }
            });
            return NextResponse.json({ success: true, message: 'Chat history cleared' });
        } else if (action === 'delete') {
            // Delete the entire conversation
            // Prisma will handle cascades if configured, otherwise we delete participants and messages manually
            // Checked schema before, usually we want to be safe.

            await db.$transaction([
                db.message.deleteMany({ where: { conversationId } }),
                db.conversationParticipant.deleteMany({ where: { conversationId } }),
                db.conversation.delete({ where: { id: conversationId } })
            ]);

            return NextResponse.json({ success: true, message: 'Conversation deleted' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Failed to handle conversation action:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const pollId = params.id;
        const { optionId } = await request.json();

        if (!optionId) {
            return NextResponse.json({ error: 'Option ID is required' }, { status: 400 });
        }

        // Verify the poll is active
        const poll = await db.poll.findUnique({
            where: { id: pollId }
        });

        if (!poll) {
            return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
        }

        if (!poll.isActive) {
            return NextResponse.json({ error: 'This poll is no longer active' }, { status: 400 });
        }

        // Verify the option belongs to the poll
        const option = await db.pollOption.findUnique({
            where: { id: optionId }
        });

        if (!option || option.pollId !== pollId) {
            return NextResponse.json({ error: 'Invalid option selected' }, { status: 400 });
        }

        // Check if user has already voted
        const existingVote = await db.pollVote.findFirst({
            where: {
                pollId,
                userId: user.userId
            }
        });

        if (existingVote) {
            return NextResponse.json({ error: 'You have already voted on this poll' }, { status: 400 });
        }

        // Record the vote
        await db.pollVote.create({
            data: {
                pollId,
                optionId,
                userId: user.userId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vote Poll Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const polls = await db.poll.findMany({
            where: { isActive: true },
            include: {
                options: {
                    include: {
                        _count: {
                            select: { votes: true }
                        }
                    }
                },
                votes: {
                    where: { userId: user.userId },
                    select: { optionId: true }
                },
                _count: {
                    select: { votes: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Format the response so the frontend knows if the user has voted
        const formattedPolls = polls.map(poll => {
            const hasVoted = poll.votes.length > 0;
            const userVoteOptionId = hasVoted ? poll.votes[0].optionId : null;

            return {
                ...poll,
                hasVoted,
                userVoteOptionId,
                // Remove the naked votes array exposing other data
                votes: undefined
            };
        });

        return NextResponse.json(formattedPolls);
    } catch (error) {
        console.error('Fetch Active Polls Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

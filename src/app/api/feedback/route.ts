import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { type, message, rating } = body;

        if (!type || !message) {
            return NextResponse.json({ error: 'Type and message are required' }, { status: 400 });
        }

        const validTypes = ['positive', 'suggestion', 'bug'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
        }

        const newFeedback = await db.feedback.create({
            data: {
                userId: user.userId,
                type,
                message,
                rating: rating ? parseInt(rating) : null,
            }
        });

        return NextResponse.json(newFeedback, { status: 201 });

    } catch (error) {
        console.error('Feedback Submission Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

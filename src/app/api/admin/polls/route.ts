import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const polls = await db.poll.findMany({
            include: {
                options: {
                    include: {
                        _count: {
                            select: { votes: true }
                        }
                    }
                },
                _count: {
                    select: { votes: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(polls);
    } catch (error) {
        console.error('Fetch Polls Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { question, description, options } = await request.json();

        if (!question || !options || !Array.isArray(options) || options.length < 2) {
            return NextResponse.json({ error: 'Question and at least 2 options are required' }, { status: 400 });
        }

        const poll = await db.poll.create({
            data: {
                question,
                description,
                options: {
                    create: options.map((opt: string) => ({ text: opt }))
                }
            },
            include: {
                options: true,
                _count: {
                    select: { votes: true }
                }
            }
        });

        return NextResponse.json(poll);
    } catch (error) {
        console.error('Create Poll Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

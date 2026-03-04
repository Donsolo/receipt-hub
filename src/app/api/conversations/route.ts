import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET all conversations for the authenticated user
export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const conversations = await db.conversation.findMany({
            where: {
                participants: {
                    some: { userId: user.userId }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                businessName: true,
                                email: true,
                                businessLogoPath: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json(conversations);
    } catch (error) {
        console.error('Failed to fetch conversations:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST to find or create a conversation with a target user
export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { targetUserId } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
        }

        if (user.userId === targetUserId) {
            return NextResponse.json({ error: 'Cannot create a conversation with yourself.' }, { status: 400 });
        }

        // Check if connection exists and is accepted
        const connection = await db.connection.findFirst({
            where: {
                OR: [
                    { requesterId: user.userId, receiverId: targetUserId, status: "accepted" },
                    { requesterId: targetUserId, receiverId: user.userId, status: "accepted" }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ error: 'You can only message accepted connections.' }, { status: 403 });
        }

        // Find existing conversation
        // We look for a conversation that has BOTH users as participants
        const existingConvos = await db.conversation.findMany({
            where: {
                AND: [
                    { participants: { some: { userId: user.userId } } },
                    { participants: { some: { userId: targetUserId } } }
                ]
            }
        });

        if (existingConvos.length > 0) {
            return NextResponse.json({ conversation: existingConvos[0] });
        }

        // Create new conversation
        const newConversation = await db.conversation.create({
            data: {
                participants: {
                    create: [
                        { userId: user.userId },
                        { userId: targetUserId }
                    ]
                }
            }
        });

        return NextResponse.json({ conversation: newConversation });
    } catch (error) {
        console.error('Failed to find or create conversation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

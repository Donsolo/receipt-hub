import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userPayload = await verifyToken(token);
        if (!userPayload || !await isAdmin(userPayload.userId as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, message, target } = await request.json();

        if (!message || message.length > 3000) {
            return NextResponse.json({ error: 'Message is required and must be under 3000 characters.' }, { status: 400 });
        }

        // 1. Identify System Sender
        const systemUser = await db.user.findUnique({
            where: { email: 'support@verihub.app' }
        });

        if (!systemUser) {
            return NextResponse.json({ error: 'System Support account not found. Please run the setup script.' }, { status: 500 });
        }

        // 2. Identify Target Users
        const whereClause: any = {
            id: { not: systemUser.id } // Don't message self
        };
        
        if (target === 'FREE_USERS') whereClause.plan = 'CORE';
        else if (target === 'PRO_USERS') whereClause.plan = 'PRO';
        else if (target === 'BUSINESS_USERS') whereClause.plan = 'NON_EXISTENT'; // Target none if business selected but not in schema

        const targetUsers = await db.user.findMany({
            where: whereClause,
            select: { id: true }
        });

        if (targetUsers.length === 0) {
            return NextResponse.json({ count: 0 });
        }

        // 3. Batch Processing (Groups of 50)
        const batchSize = 50;
        let totalProcessed = 0;

        for (let i = 0; i < targetUsers.length; i += batchSize) {
            const batch = targetUsers.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (targetUser) => {
                // Find or create conversation
                // Note: We use the same finding logic as existing conversations API
                let conversation = await db.conversation.findFirst({
                    where: {
                        AND: [
                            { participants: { some: { userId: systemUser.id } } },
                            { participants: { some: { userId: targetUser.id } } }
                        ]
                    }
                });

                if (!conversation) {
                    conversation = await db.conversation.create({
                        data: {
                            participants: {
                                create: [
                                    { userId: systemUser.id },
                                    { userId: targetUser.id }
                                ]
                            }
                        }
                    });
                }

                // Create message
                const content = subject ? `**${subject}**\n\n${message}` : message;
                
                await db.message.create({
                    data: {
                        conversationId: conversation.id,
                        senderId: systemUser.id,
                        content: content
                    }
                });

                // Update conversation's updatedAt to bubble it to the top
                await db.conversation.update({
                    where: { id: conversation.id },
                    data: { updatedAt: new Date() }
                });
            }));

            totalProcessed += batch.length;
        }

        return NextResponse.json({ success: true, count: totalProcessed });
    } catch (error) {
        console.error('Failed to send global message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

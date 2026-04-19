import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendNativePush } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId: connectionId } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        // Ensure these users are actually connected and accepted
        const connection = await db.connection.findFirst({
            where: {
                OR: [
                    { requesterId: user.userId, receiverId: connectionId, status: "accepted" },
                    { requesterId: connectionId, receiverId: user.userId, status: "accepted" }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ error: 'You can only message accepted connections.' }, { status: 403 });
        }

        // Find the 1-on-1 Conversation ID
        const conversationUsers = [user.userId, connectionId];
        const sharedConvos = await db.conversationParticipant.findMany({
            where: { userId: { in: conversationUsers } },
            select: { conversationId: true, userId: true }
        });

        const convTally: Record<string, string[]> = {};
        for (const p of sharedConvos) {
            if (!convTally[p.conversationId]) convTally[p.conversationId] = [];
            convTally[p.conversationId].push(p.userId);
        }

        let targetConvId = null;
        for (const [cId, uIds] of Object.entries(convTally)) {
            if (uIds.includes(user.userId) && uIds.includes(connectionId) && uIds.length === 2) {
                targetConvId = cId;
                break;
            }
        }

        if (!targetConvId) {
            // No messages exist yet
            return NextResponse.json([]);
        }

        const messages = await db.message.findMany({
            where: { conversationId: targetConvId },
            include: {
                attachments: {
                    include: { receipt: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId: receiverId } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        if (user.userId === receiverId) {
            return NextResponse.json({ error: 'Cannot message yourself.' }, { status: 400 });
        }

        const body = await request.json();
        const { text, receiptIds, attachmentType = 'RECEIPT', bundleName, snapshotData } = body;

        let messageText = text || '';

        if (!messageText && (!receiptIds || receiptIds.length === 0) && !snapshotData) {
            return NextResponse.json({ error: 'Message text or an attachment is required.' }, { status: 400 });
        }

        if (messageText.length > 2000) {
            return NextResponse.json({ error: 'Message text exceeds maximum length.' }, { status: 400 });
        }

        // Verify connection status
        const connection = await db.connection.findFirst({
            where: {
                OR: [
                    { requesterId: user.userId, receiverId, status: "accepted" },
                    { requesterId: receiverId, receiverId: user.userId, status: "accepted" }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ error: 'You can only message accepted connections.' }, { status: 403 });
        }

        // Validate receipts if any for standard receipt attachment
        let validReceiptIds: string[] = [];
        if (attachmentType === 'RECEIPT' && receiptIds && Array.isArray(receiptIds) && receiptIds.length > 0) {
            const ownedReceipts = await db.receipt.findMany({
                where: { id: { in: receiptIds }, userId: user.userId },
                select: { id: true }
            });
            validReceiptIds = ownedReceipts.map(r => r.id);

            if (validReceiptIds.length !== receiptIds.length) {
                return NextResponse.json({ error: 'You do not own all the provided receipts.' }, { status: 403 });
            }
        }

        let attachmentsCreate: any = undefined;

        if (attachmentType === 'RECEIPT' && validReceiptIds.length > 0) {
            attachmentsCreate = {
                create: validReceiptIds.map(rid => ({ type: 'RECEIPT', receiptId: rid }))
            };
        } else if (attachmentType === 'BUNDLE_SNAPSHOT' && snapshotData) {
            const limitedSnapshot = Array.isArray(snapshotData) ? snapshotData.slice(0, 10) : snapshotData;
            attachmentsCreate = {
                create: {
                    type: 'BUNDLE_SNAPSHOT',
                    bundleName: bundleName || 'Receipt Bundle',
                    snapshotData: limitedSnapshot
                }
            };
        }

        // Find or create Conversation
        const conversationUsers = [user.userId, receiverId];
        const sharedConvos = await db.conversationParticipant.findMany({
            where: { userId: { in: conversationUsers } },
            select: { conversationId: true, userId: true }
        });

        const convTally: Record<string, string[]> = {};
        for (const p of sharedConvos) {
            if (!convTally[p.conversationId]) convTally[p.conversationId] = [];
            convTally[p.conversationId].push(p.userId);
        }

        let targetConvId = null;
        for (const [cId, uIds] of Object.entries(convTally)) {
            if (uIds.includes(user.userId) && uIds.includes(receiverId) && uIds.length === 2) {
                targetConvId = cId;
                break;
            }
        }

        if (!targetConvId) {
            const newConv = await db.conversation.create({
                data: {
                    participants: {
                        create: [ { userId: user.userId }, { userId: receiverId } ]
                    }
                }
            });
            targetConvId = newConv.id;
        }

        // Insert Message
        const message = await db.message.create({
            data: {
                conversationId: targetConvId,
                senderId: user.userId,
                content: messageText.trim(),
                ...(attachmentsCreate && { attachments: attachmentsCreate })
            },
            include: {
                attachments: {
                    include: { receipt: true }
                }
            }
        });

        // Fire Notification (Non-blocking)
        if (user.userId !== receiverId) {
            try {
                const receiverPref = await db.user.findUnique({
                    where: { id: receiverId },
                    select: { notifyMessages: true }
                });

                if (receiverPref?.notifyMessages) {
                    const sender = await db.user.findUnique({
                        where: { id: user.userId },
                        select: { name: true }
                    });
                    const senderName = sender?.name || 'A connection';

                    const rawText = messageText.trim();
                    const excerpt = rawText.length > 60 ? rawText.slice(0, 60) + '...' : rawText;
                    const finalExcerpt = excerpt || (attachmentType === 'RECEIPT' ? '[Receipt attached]' : '[Bundle attached]');

                    const notification = await db.notification.create({
                        data: {
                            userId: receiverId,
                            type: 'MESSAGE_RECEIVED',
                            title: 'New Secure Message',
                            message: `${senderName}: ${finalExcerpt}`,
                            link: `/dashboard/connections`,
                            read: false
                        }
                    });

                    const userDevices = await db.pushToken.findMany({ where: { userId: receiverId } });
                    const tokens = userDevices.map(d => d.token);
                    if (tokens.length > 0) {
                        await sendNativePush(tokens, {
                            title: notification.title,
                            body: notification.message,
                            data: { route: notification.link || '/' }
                        });
                    }
                }
            } catch (notifErr) {
                console.error('Failed to dispatch message notification:', notifErr);
            }
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error('Failed to send message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

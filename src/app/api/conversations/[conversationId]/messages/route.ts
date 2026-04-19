import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendNativePush } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        // Verify user is a participant
        const isParticipant = await db.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: user.userId
                }
            }
        });

        if (!isParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const messages = await db.message.findMany({
            where: { conversationId },
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
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        // Verify user is a participant
        const isParticipant = await db.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: user.userId
                }
            }
        });

        if (!isParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { text, receiptIds, attachmentType = 'RECEIPT', bundleName, snapshotData } = body;

        let messageText = text || '';

        if (!messageText && (!receiptIds || receiptIds.length === 0) && !snapshotData) {
            return NextResponse.json({ error: 'Message text or an attachment is required.' }, { status: 400 });
        }

        if (messageText.length > 2000) {
            return NextResponse.json({ error: 'Message exceeds maximum length.' }, { status: 400 });
        }

        // Validate receipts if any
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

        const message = await db.message.create({
            data: {
                conversationId,
                senderId: user.userId,
                content: messageText.trim(),
                ...(attachmentsCreate && { attachments: attachmentsCreate })
            },
            include: {
                attachments: { include: { receipt: true } }
            }
        });

        // Update the conversation's updatedAt timestamp
        await db.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        // ------------------------------------------------------------------
        // Fire Notification (Non-blocking)
        // ------------------------------------------------------------------
        try {
            // Find ALL OTHER participants to notify them
            const otherParticipants = await db.conversationParticipant.findMany({
                where: {
                    conversationId,
                    userId: { not: user.userId }
                },
                include: {
                    user: { select: { notifyMessages: true } }
                }
            });

            const sender = await db.user.findUnique({
                where: { id: user.userId },
                select: { name: true }
            });
            const senderName = sender?.name || 'A user';

            const rawText = messageText.trim();
            const excerpt = rawText.length > 60 ? rawText.slice(0, 60) + '...' : rawText;
            const finalExcerpt = excerpt || (attachmentType === 'RECEIPT' ? '[Receipt attached]' : '[Bundle attached]');

            // Dispatch to all valid receivers
            for (const participant of otherParticipants) {
                if (participant.user?.notifyMessages) {
                    const notification = await db.notification.create({
                        data: {
                            userId: participant.userId,
                            type: 'MESSAGE_RECEIVED',
                            title: 'New Message',
                            message: `${senderName}: ${finalExcerpt}`,
                            link: `/dashboard/messages/${conversationId}`,
                            read: false
                        }
                    });

                    const userDevices = await db.pushToken.findMany({ where: { userId: participant.userId } });
                    const tokens = userDevices.map(d => d.token);
                    if (tokens.length > 0) {
                        await sendNativePush(tokens, {
                            title: notification.title,
                            body: notification.message,
                            data: { route: notification.link || '/' }
                        });
                    }
                }
            }
        } catch (notifErr) {
            console.error('Failed to dispatch message notification:', notifErr);
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error('Failed to send message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

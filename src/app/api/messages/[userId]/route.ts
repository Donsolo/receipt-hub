import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

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
        const connection = await (db as any).connection.findFirst({
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

        const messages = await (db as any).message.findMany({
            where: {
                OR: [
                    { senderId: user.userId, receiverId: connectionId },
                    { senderId: connectionId, receiverId: user.userId }
                ]
            },
            include: {
                attachments: {
                    include: {
                        receipt: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
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
            return NextResponse.json({ error: 'Message exceeds maximum length.' }, { status: 400 });
        }

        // Verify connection status
        const connection = await (db as any).connection.findFirst({
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
            const ownedReceipts = await (db as any).receipt.findMany({
                where: {
                    id: { in: receiptIds },
                    userId: user.userId
                },
                select: { id: true }
            });
            validReceiptIds = ownedReceipts.map((r: any) => r.id);

            // Fail strictly if any receipt ID passed isn't owned by the user
            if (validReceiptIds.length !== receiptIds.length) {
                return NextResponse.json({ error: 'You do not own all the provided receipts.' }, { status: 403 });
            }
        }

        let attachmentsCreate: any = undefined;

        if (attachmentType === 'RECEIPT' && validReceiptIds.length > 0) {
            attachmentsCreate = {
                create: validReceiptIds.map(rid => ({
                    type: 'RECEIPT',
                    receiptId: rid
                }))
            };
        } else if (attachmentType === 'BUNDLE_SNAPSHOT' && snapshotData) {
            // Snapshot arrays should strictly be capped at 10 items
            const limitedSnapshot = Array.isArray(snapshotData) ? snapshotData.slice(0, 10) : snapshotData;
            attachmentsCreate = {
                create: {
                    type: 'BUNDLE_SNAPSHOT',
                    bundleName: bundleName || 'Receipt Bundle',
                    snapshotData: limitedSnapshot
                }
            };
        }

        const message = await (db as any).message.create({
            data: {
                senderId: user.userId,
                receiverId,
                text: messageText.trim(),
                ...(attachmentsCreate && { attachments: attachmentsCreate })
            },
            include: {
                attachments: {
                    include: {
                        receipt: true
                    }
                }
            }
        });

        // ------------------------------------------------------------------
        // Fire Notification (Non-blocking)
        // ------------------------------------------------------------------
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
                    const senderName = sender?.name || 'A user';

                    const rawText = messageText.trim();
                    const excerpt = rawText.length > 60
                        ? rawText.slice(0, 60) + '...'
                        : rawText;

                    const finalExcerpt = excerpt || (attachmentType === 'RECEIPT' ? '[Receipt attached]' : '[Bundle attached]');

                    await db.notification.create({
                        data: {
                            userId: receiverId,
                            type: 'MESSAGE_RECEIVED',
                            title: 'New Message',
                            message: `${senderName}: ${finalExcerpt}`,
                            link: `/dashboard/connections`,
                            read: false
                        }
                    });
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

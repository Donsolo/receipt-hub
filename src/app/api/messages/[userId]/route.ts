import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
                receipts: {
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

        if (user.userId === receiverId) {
            return NextResponse.json({ error: 'Cannot message yourself.' }, { status: 400 });
        }

        const body = await request.json();
        const { text, receiptIds } = body;

        let messageText = text || '';

        if (!messageText && (!receiptIds || receiptIds.length === 0)) {
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

        // Validate receipts if any
        let validReceiptIds: string[] = [];
        if (receiptIds && Array.isArray(receiptIds) && receiptIds.length > 0) {
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

        const message = await (db as any).message.create({
            data: {
                senderId: user.userId,
                receiverId,
                text: messageText.trim(),
                ...(validReceiptIds.length > 0 && {
                    receipts: {
                        create: validReceiptIds.map(rid => ({
                            receiptId: rid
                        }))
                    }
                })
            },
            include: {
                receipts: {
                    include: {
                        receipt: true
                    }
                }
            }
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error('Failed to send message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendNativePush } from '@/lib/push';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { recipientUserId, enableOnlinePayment } = body;

        if (!recipientUserId) {
            return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
        }

        // 1. Verify Sender is Pro/Admin
        const sender = await db.user.findUnique({
            where: { id: user.userId }
        });
        if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isPro = (sender.plan === 'PRO' && sender.planStatus !== 'inactive') || sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Payment requests are a Pro feature.' }, { status: 403 });
        }

        // 2. Fetch and Validate Invoice
        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot request payment for a fully paid invoice' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot request payment for a cancelled invoice' }, { status: 400 });
        
        const remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
        if (remainingBalance <= 0) return NextResponse.json({ error: 'Invoice has no remaining balance' }, { status: 400 });

        // Enable online payments if requested and not already enabled
        if (!invoice.acceptOnlinePayment) {
            if (enableOnlinePayment) {
                await db.invoice.update({
                    where: { id },
                    data: { acceptOnlinePayment: true }
                });
                invoice.acceptOnlinePayment = true;
            } else {
                return NextResponse.json({ error: 'Online payments must be enabled for this invoice before sending a payment request.' }, { status: 400 });
            }
        }

        // 3. Verify Recipient is an accepted connection
        const connection = await db.connection.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { requesterId: user.userId, receiverId: recipientUserId },
                    { requesterId: recipientUserId, receiverId: user.userId }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ error: 'Recipient is not in your accepted network' }, { status: 403 });
        }

        // 4. Generate/Retrieve Public Token
        let publicToken = invoice.publicToken;
        if (!publicToken) {
            const { randomBytes } = await import('crypto');
            publicToken = randomBytes(32).toString('hex');
            await db.invoice.update({
                where: { id },
                data: { publicToken }
            });
        }

        // 5. Find or Create Conversation
        let conversation = await db.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { userId: user.userId } } },
                    { participants: { some: { userId: recipientUserId } } },
                ]
            }
        });

        if (!conversation) {
            conversation = await db.conversation.create({
                data: {
                    participants: {
                        create: [
                            { userId: user.userId },
                            { userId: recipientUserId }
                        ]
                    }
                }
            });
        }

        // 5.5 Prevent Spam (No more than 1 request per invoice per conversation per 15 minutes)
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentRequest = await db.message.findFirst({
            where: {
                conversationId: conversation.id,
                type: 'INVOICE_PAYMENT_REQUEST',
                senderId: user.userId,
                createdAt: { gte: fifteenMinsAgo },
                // prisma JSON filtering isn't perfect for all DBs, so we filter by content or just any recent request from this sender for any invoice is fine, but specifically we could check metadata.
                content: { contains: invoice.id } // we can embed the invoice ID in the content to make it queryable.
            }
        });

        if (recentRequest) {
            return NextResponse.json({ error: 'You already sent a request for this invoice recently. Please wait 15 minutes before sending another.' }, { status: 429 });
        }

        // 6. Create Message with Metadata
        const { createId } = await import('@paralleldrive/cuid2');
        const requestLogId = createId();

        const businessName = sender.businessName || sender.name || sender.email?.split('@')[0] || 'A business';
        
        const metadata = {
            invoiceId: invoice.id,
            invoiceToken: publicToken,
            invoiceNumber: invoice.invoiceNumber || invoice.title,
            businessName: businessName,
            total: invoice.total,
            amountPaid: invoice.amountPaid || 0,
            remainingBalance: remainingBalance,
            paymentStatus: invoice.paymentStatus,
            sentAt: new Date().toISOString(),
            requestLogId: requestLogId
        };

        const message = await db.message.create({
            data: {
                conversationId: conversation.id,
                senderId: user.userId,
                content: `[req:${invoice.id}] Sent a payment request for Invoice #${invoice.invoiceNumber || invoice.title}`,
                type: 'INVOICE_PAYMENT_REQUEST',
                metadata: metadata
            }
        });

        await db.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() }
        });

        // 7. Send Notification to Recipient
        const recipient = await db.user.findUnique({
            where: { id: recipientUserId },
            select: { notifyMessages: true }
        });

        if (recipient?.notifyMessages) {
            const notification = await db.notification.create({
                data: {
                    userId: recipientUserId,
                    type: 'MESSAGE_RECEIVED',
                    title: 'New Payment Request',
                    message: `${businessName} sent you a payment request for Invoice #${invoice.invoiceNumber || invoice.title}.`,
                    link: `/dashboard/messages/${conversation.id}`,
                    read: false
                }
            });

            // Send push notification if available
            const userDevices = await db.pushToken.findMany({
                where: { userId: recipientUserId }
            });
            const tokens = userDevices.map(d => d.token);
            if (tokens.length > 0) {
                await sendNativePush(tokens, {
                    title: notification.title,
                    body: notification.message,
                    data: { route: notification.link || '/' }
                });
            }
        }

        // 8. Log the activity
        await db.invoicePaymentRequestLog.create({
            data: {
                id: requestLogId,
                invoiceId: id,
                channel: 'NETWORK',
                recipientUserId,
                conversationId: conversation.id,
                messageId: message.id,
                action: 'REQUEST_SENT',
                status: 'SENT'
            }
        });

        // Update invoice status if draft
        if (invoice.status === 'DRAFT') {
            await db.invoice.update({
                where: { id },
                data: { status: 'SENT', sentAt: new Date() }
            });
        }

        return NextResponse.json({ success: true, messageId: message.id });

    } catch (error) {
        console.error('Failed to send payment request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

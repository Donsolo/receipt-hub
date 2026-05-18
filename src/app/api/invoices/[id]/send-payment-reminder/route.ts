import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendInvoiceReminderEmail } from '@/lib/email';
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
        const { channel, email, recipientUserId, message, installmentId } = body;

        if (!['EMAIL', 'NETWORK'].includes(channel)) {
            return NextResponse.json({ error: 'Invalid channel specified.' }, { status: 400 });
        }

        if (channel === 'EMAIL' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
            return NextResponse.json({ error: 'A valid recipient email is required for email reminders.' }, { status: 400 });
        }

        if (channel === 'NETWORK' && !recipientUserId) {
            return NextResponse.json({ error: 'Recipient User ID is required for network reminders.' }, { status: 400 });
        }

        // 1. Verify Sender is Pro/Admin
        const sender = await db.user.findUnique({
            where: { id: user.userId }
        });
        if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isPro = (sender.plan === 'PRO' && sender.planStatus !== 'inactive') || sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Payment reminders are a Pro feature.' }, { status: 403 });
        }

        // 2. Fetch and Validate Invoice
        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot send reminder for a fully paid invoice' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot send reminder for a cancelled invoice' }, { status: 400 });
        if (!invoice.acceptOnlinePayment) return NextResponse.json({ error: 'Online payments must be enabled to send a reminder.' }, { status: 400 });
        
        let remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
        if (remainingBalance <= 0) return NextResponse.json({ error: 'Invoice has no remaining balance' }, { status: 400 });

        let installmentLabel = '';
        let installmentAmount = 0;
        if (installmentId && invoice.paymentPlanEnabled) {
            const installment = await db.invoiceInstallment.findUnique({ where: { id: installmentId } });
            if (!installment || installment.invoiceId !== id) {
                return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
            }
            if (installment.status === 'PAID') {
                return NextResponse.json({ error: 'This installment is already paid.' }, { status: 400 });
            }
            installmentLabel = installment.label || 'installment';
            installmentAmount = installment.amount;
        }

        let publicToken = invoice.publicToken;
        if (!publicToken) {
            const { randomBytes } = await import('crypto');
            publicToken = randomBytes(32).toString('hex');
            await db.invoice.update({ where: { id }, data: { publicToken } });
        }

        // 3. Reminder Cooldown Check
        // Max 1 reminder per channel/recipient per 24 hours.
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const whereClause: any = {
            invoiceId: id,
            channel,
            action: 'REMINDER_SENT',
            status: 'SENT',
            createdAt: { gte: oneDayAgo }
        };
        if (channel === 'EMAIL') whereClause.recipientEmail = email;
        if (channel === 'NETWORK') whereClause.recipientUserId = recipientUserId;

        const recentReminder = await db.invoicePaymentRequestLog.findFirst({ where: whereClause });

        if (recentReminder) {
            await db.invoicePaymentRequestLog.create({
                data: {
                    invoiceId: id,
                    channel,
                    recipientEmail: email,
                    recipientUserId,
                    action: 'REMINDER_SENT',
                    status: 'BLOCKED'
                }
            });
            return NextResponse.json({ error: 'A reminder was already sent recently. Try again later.' }, { status: 429 });
        }

        // Max 3 reminders total per 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentWeeklyCount = await db.invoicePaymentRequestLog.count({
            where: {
                invoiceId: id,
                action: 'REMINDER_SENT',
                status: 'SENT',
                createdAt: { gte: sevenDaysAgo }
            }
        });

        if (recentWeeklyCount >= 3) {
             return NextResponse.json({ error: 'Maximum weekly reminder limit reached (3). Try again later.' }, { status: 429 });
        }

        // 4. Generate Request Log ID beforehand for tracking
        const { createId } = await import('@paralleldrive/cuid2');
        const requestLogId = createId();

        const businessName = sender.businessName || sender.name || sender.email?.split('@')[0] || 'A business';
        const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app'}/portal/invoice/${publicToken}?src=${channel === 'EMAIL' ? 'email_reminder' : 'network_reminder'}&rid=${requestLogId}`;
        
        let conversationId = null;
        let messageId = null;

        if (channel === 'EMAIL') {
            let customNote = message?.trim();
            if (installmentId) {
                const prefix = `Reminder for ${installmentLabel} ($${installmentAmount.toFixed(2)})`;
                customNote = customNote ? `${prefix} - ${customNote}` : prefix;
            }

            const emailSent = await sendInvoiceReminderEmail({
                to: email,
                businessName,
                invoiceNumber: invoice.invoiceNumber || invoice.title,
                remainingBalance: installmentId ? installmentAmount : remainingBalance,
                dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
                paymentLink,
                customMessage: customNote
            });

            if (!emailSent) {
                await db.invoicePaymentRequestLog.create({
                    data: { id: requestLogId, invoiceId: id, channel, recipientEmail: email, action: 'REMINDER_SENT', status: 'FAILED' }
                });
                return NextResponse.json({ error: 'Email service is not configured or failed to send.' }, { status: 500 });
            }
        } else if (channel === 'NETWORK') {
            // Must have existing connection
            const connection = await db.connection.findFirst({
                where: {
                    status: 'ACCEPTED',
                    OR: [
                        { requesterId: user.userId, receiverId: recipientUserId },
                        { requesterId: recipientUserId, receiverId: user.userId }
                    ]
                }
            });

            if (!connection) return NextResponse.json({ error: 'Recipient is not in your accepted network' }, { status: 403 });

            let conversation = await db.conversation.findFirst({
                where: {
                    AND: [
                        { participants: { some: { userId: user.userId } } },
                        { participants: { some: { userId: recipientUserId } } },
                    ]
                }
            });

            if (!conversation) return NextResponse.json({ error: 'No conversation history found for this network user.' }, { status: 400 });
            conversationId = conversation.id;

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
                isReminder: true,
                installmentId: installmentId || null,
                installmentLabel: installmentLabel || null
            };

            const chatContent = installmentId 
                ? `[rem:${invoice.id}] Sent a payment reminder for ${installmentLabel} ($${installmentAmount.toFixed(2)}) on Invoice #${invoice.invoiceNumber || invoice.title}`
                : `[rem:${invoice.id}] Sent a payment reminder for Invoice #${invoice.invoiceNumber || invoice.title}`;

            const chatMessage = await db.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: user.userId,
                    content: chatContent,
                    type: 'INVOICE_PAYMENT_REQUEST', // Re-using card renderer
                    metadata: metadata
                }
            });
            messageId = chatMessage.id;

            await db.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

            const recipient = await db.user.findUnique({ where: { id: recipientUserId }, select: { notifyMessages: true } });
            if (recipient?.notifyMessages) {
                const notification = await db.notification.create({
                    data: {
                        userId: recipientUserId,
                        type: 'MESSAGE_RECEIVED',
                        title: 'Invoice Payment Reminder',
                        message: `${businessName} sent you a reminder for Invoice #${invoice.invoiceNumber || invoice.title}.`,
                        link: `/dashboard/messages/${conversation.id}`,
                        read: false
                    }
                });

                const userDevices = await db.pushToken.findMany({ where: { userId: recipientUserId } });
                const tokens = userDevices.map(d => d.token);
                if (tokens.length > 0) {
                    await sendNativePush(tokens, { title: notification.title, body: notification.message, data: { route: notification.link || '/' } });
                }
            }
        }

        // 5. Log Success
        await db.invoicePaymentRequestLog.create({
            data: {
                id: requestLogId,
                invoiceId: id,
                channel,
                recipientEmail: email,
                recipientUserId,
                conversationId,
                messageId,
                action: 'REMINDER_SENT',
                status: 'SENT',
                metadata: installmentId ? { installmentId, installmentLabel, installmentAmount } : {}
            }
        });

        if (invoice.customerContactId) {
            await db.customerCommunicationLog.create({
                data: {
                    ownerId: user.userId,
                    customerContactId: invoice.customerContactId,
                    channel: channel === 'NETWORK' ? 'NETWORK' : 'EMAIL',
                    direction: 'OUTBOUND',
                    subject: 'Invoice Payment Reminder',
                    contentPreview: message?.trim() || (installmentId ? `Reminder for ${installmentLabel}` : `Payment reminder for invoice ${invoice.invoiceNumber || invoice.title}`),
                    relatedInvoiceId: id,
                    status: 'SENT'
                }
            });
        }

        // 6. Update Invoice fields
        await db.invoice.update({
            where: { id },
            data: {
                lastPaymentReminderAt: new Date(),
                paymentReminderCount: { increment: 1 }
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to send payment reminder:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

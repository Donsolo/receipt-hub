import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendReminderEmail } from '@/lib/vero-lens/email/sendReminderEmail';

export async function POST(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id },
            include: { user: true }
        });

        if (!session) return new NextResponse('Not Found', { status: 404 });

        const body = await request.json();
        const { customerEmail } = body;

        if (!customerEmail) {
            return new NextResponse('Customer email is required for a reminder', { status: 400 });
        }

        const activeShare = await db.veroLensShare.findFirst({
            where: { sessionId: id, status: 'ACTIVE' }
        });

        if (!activeShare) {
            return new NextResponse('No active share link found. Please generate one first.', { status: 404 });
        }

        // 5-minute cooldown
        if (activeShare.lastReminderSentAt) {
            const timeSinceLastReminder = new Date().getTime() - new Date(activeShare.lastReminderSentAt).getTime();
            if (timeSinceLastReminder < 5 * 60 * 1000) {
                return new NextResponse('A reminder was sent recently. Please wait a few minutes before sending another.', { status: 429 });
            }
        }

        const businessName = session.user.businessName || session.user.name || 'Service Estimate';
        const quoteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${activeShare.token}`;
        
        const emailSent = await sendReminderEmail(customerEmail, businessName, quoteLink);
        
        if (!emailSent) {
            return new NextResponse('Failed to send reminder email. Please try again.', { status: 500 });
        }

        await db.$transaction(async (tx) => {
            await tx.veroLensShare.update({
                where: { id: activeShare.id },
                data: {
                    reminderCount: { increment: 1 },
                    lastReminderSentAt: new Date()
                }
            });

            await tx.veroLensEvent.create({
                data: {
                    sessionId: id,
                    type: 'REMINDER_SENT',
                    message: `Reminder email sent to ${customerEmail}.`
                }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[VERO_LENS_REMINDER_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

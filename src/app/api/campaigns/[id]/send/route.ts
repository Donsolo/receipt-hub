import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import nodemailer from 'nodemailer';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const campaign = await db.customerEmailCampaign.findUnique({
            where: { id },
            include: {
                recipients: true
            }
        });

        if (!campaign || campaign.ownerId !== user.id) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        if (campaign.status !== 'DRAFT' && campaign.status !== 'FAILED') {
            return NextResponse.json({ error: 'Campaign is already sending or sent' }, { status: 400 });
        }

        // Rate limiting: 1 campaign per 15 minutes globally for this user
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentCampaign = await db.customerEmailCampaign.findFirst({
            where: {
                ownerId: user.id,
                status: 'SENT',
                sentAt: { gte: fifteenMinsAgo }
            }
        });

        if (recentCampaign) {
            return NextResponse.json({ error: 'You can only send one campaign every 15 minutes to prevent spam.' }, { status: 429 });
        }

        await db.customerEmailCampaign.update({
            where: { id },
            data: { status: 'SENDING' }
        });

        // Trigger background processing (Vercel edge functions have short timeouts, so in a real app this should use an external queue like Upstash QStash or Inngest. For this MVP, we will send sequentially and await).
        
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const fromAddress = process.env.VERIHUB_EMAIL_FROM || 'Verihub <verihub@tektriq.com>';

        let successCount = 0;
        let failCount = 0;

        for (const recipient of campaign.recipients) {
            if (recipient.status === 'SENT') continue;

            try {
                // Tracking pixel simulation could be added here if implemented
                const finalHtml = campaign.contentHtml || `<p>${campaign.contentText?.replace(/\\n/g, '<br/>')}</p>`;
                
                await transporter.sendMail({
                    from: fromAddress,
                    to: recipient.email,
                    subject: campaign.subject,
                    text: campaign.contentText || campaign.previewText || '',
                    html: finalHtml
                });

                await db.customerEmailCampaignRecipient.update({
                    where: { id: recipient.id },
                    data: { status: 'SENT' }
                });

                await db.customerCommunicationLog.create({
                    data: {
                        ownerId: user.id,
                        customerContactId: recipient.customerContactId,
                        channel: 'EMAIL',
                        direction: 'OUTBOUND',
                        subject: campaign.subject,
                        contentPreview: campaign.previewText || campaign.subject,
                        relatedCampaignId: campaign.id,
                        status: 'SENT'
                    }
                });

                successCount++;
            } catch (err) {
                console.error(`Failed to send to ${recipient.email}:`, err);
                await db.customerEmailCampaignRecipient.update({
                    where: { id: recipient.id },
                    data: { status: 'FAILED' }
                });
                failCount++;
            }
        }

        await db.customerEmailCampaign.update({
            where: { id },
            data: { 
                status: 'SENT',
                sentAt: new Date()
            }
        });

        return NextResponse.json({ success: true, successCount, failCount }, { status: 200 });
    } catch (error) {
        console.error('Send campaign error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

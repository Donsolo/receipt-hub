import { sendEmail } from '@/lib/email';
import { emailStyles, wrapEmail } from './emailStyles';

export async function sendRevisionRequestNotification(to: string, businessName: string, quoteLink: string, message: string, customerName: string) {
    const content = `
        <h2 style="${emailStyles.title}; color: #ea580c;">Revision Requested</h2>
        <p style="${emailStyles.text}; text-align: center;">
            <strong>${customerName || 'Your customer'}</strong> has requested a revision to the estimate.
        </p>
        <div style="${emailStyles.quoteMessage}">
            "${message}"
        </div>
        <div style="${emailStyles.buttonContainer}">
            <a href="${quoteLink}" style="${emailStyles.buttonPrimary}">
                Review & Update Estimate
            </a>
        </div>
    `;
    return sendEmail({
        to,
        subject: `Revision Requested - ${businessName}`,
        html: wrapEmail(content, businessName)
    });
}

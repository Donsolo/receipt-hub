import { sendEmail } from '@/lib/email';
import { emailStyles, wrapEmail } from './emailStyles';

export async function sendQuoteApprovedNotification(to: string, businessName: string, quoteLink: string, customerName: string) {
    const content = `
        <h2 style="${emailStyles.title}; color: #059669;">Estimate Approved</h2>
        <p style="${emailStyles.text}; text-align: center;">
            Great news! <strong>${customerName || 'Your customer'}</strong> has approved the service estimate.
        </p>
        <div style="${emailStyles.buttonContainer}">
            <a href="${quoteLink}" style="${emailStyles.buttonPrimary}">
                View Details
            </a>
        </div>
    `;
    return sendEmail({
        to,
        subject: `Estimate Approved - ${businessName}`,
        html: wrapEmail(content, businessName)
    });
}

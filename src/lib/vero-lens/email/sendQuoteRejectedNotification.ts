import { sendEmail } from '@/lib/email';
import { emailStyles, wrapEmail } from './emailStyles';

export async function sendQuoteRejectedNotification(to: string, businessName: string, quoteLink: string, customerName: string, message?: string) {
    const messageHtml = message ? `<div style="${emailStyles.quoteMessage}">"${message}"</div>` : '';
    const content = `
        <h2 style="${emailStyles.title}; color: #dc2626;">Estimate Declined</h2>
        <p style="${emailStyles.text}; text-align: center;">
            <strong>${customerName || 'Your customer'}</strong> has declined the service estimate.
        </p>
        ${messageHtml}
        <div style="${emailStyles.buttonContainer}">
            <a href="${quoteLink}" style="${emailStyles.buttonPrimary}">
                View Estimate
            </a>
        </div>
    `;
    return sendEmail({
        to,
        subject: `Estimate Declined - ${businessName}`,
        html: wrapEmail(content, businessName)
    });
}

import { sendEmail } from '@/lib/email';
import { emailStyles, wrapEmail } from './emailStyles';

export async function sendReminderEmail(to: string, businessName: string, quoteLink: string) {
    const content = `
        <h2 style="${emailStyles.title}">Reminder: Review Your Estimate</h2>
        <p style="${emailStyles.text}; text-align: center;">
            This is a polite reminder from ${businessName} that your service estimate is waiting for your review.
        </p>
        <div style="${emailStyles.buttonContainer}">
            <a href="${quoteLink}" style="${emailStyles.buttonPrimary}">
                View Your Estimate
            </a>
        </div>
    `;
    return sendEmail({
        to,
        subject: `Reminder: Estimate from ${businessName}`,
        html: wrapEmail(content, businessName)
    });
}

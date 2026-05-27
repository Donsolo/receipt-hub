import { sendEmail } from '@/lib/email';
import { emailStyles, wrapEmail } from './emailStyles';

export async function sendQuoteShareEmail(to: string, businessName: string, quoteLink: string) {
    const content = `
        <h2 style="${emailStyles.title}">Your Service Estimate is Ready</h2>
        <p style="${emailStyles.text}; text-align: center;">
            ${businessName} has prepared a secure estimate for your review.
        </p>
        <div style="${emailStyles.buttonContainer}">
            <a href="${quoteLink}" style="${emailStyles.buttonPrimary}">
                Review Estimate
            </a>
        </div>
        <p style="${emailStyles.text}; font-size: 14px; text-align: center; color: #6b7280;">
            You can review annotated visual references, scope of work, and securely approve or request revisions.
        </p>
    `;
    return sendEmail({
        to,
        subject: `Your Service Estimate from ${businessName}`,
        html: wrapEmail(content, businessName)
    });
}

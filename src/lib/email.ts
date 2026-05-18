import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials not configured. Email blocked:', subject);
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Verihub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// ------------------------------------------------------------------
// TEMPLATES
// ------------------------------------------------------------------

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
    const subject = 'Password Reset Request - Verihub';
    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #111827; font-size: 24px; margin: 0;">Verihub</h1>
            </div>
            
            <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin-bottom: 16px;">Password Reset Request</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 16px; font-weight: 600; border-radius: 8px; transition: background-color 0.2s;">
                    Reset Password
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 24px; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #4f46e5; text-decoration: underline; word-break: break-all;">${resetUrl}</a>
            </p>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center;">
                This link will expire in 1 hour.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                &copy; ${new Date().getFullYear()} Tektriq LLC. All rights reserved.
            </p>
        </div>
    `;

    return sendEmail({ to: email, subject, html });
}

export async function sendInvoicePaymentEmail(options: { 
    to: string, 
    businessName: string, 
    invoiceNumber: string, 
    remainingBalance: number, 
    dueDate?: string | null, 
    paymentLink: string, 
    customMessage?: string 
}) {
    const { to, businessName, invoiceNumber, remainingBalance, dueDate, paymentLink, customMessage } = options;
    const subject = `Payment request for Invoice #${invoiceNumber}`;
    
    const dueDateHtml = dueDate ? `<p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Due Date: <strong>${new Date(dueDate).toLocaleDateString()}</strong></p>` : '';
    const customMessageHtml = customMessage ? `<div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #4f46e5; margin-bottom: 24px; border-radius: 4px;"><p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">"${customMessage}"</p></div>` : '';

    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #111827; font-size: 20px; margin: 0;">${businessName}</h1>
            </div>
            
            <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 16px; text-align: center;">Payment Request</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
                ${businessName} has sent you a secure payment request for <strong>Invoice #${invoiceNumber}</strong>.
            </p>

            ${customMessageHtml}
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
                <p style="color: #4b5563; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Amount Due</p>
                <p style="color: #111827; font-size: 32px; font-weight: 900; margin: 5px 0;">$${remainingBalance.toFixed(2)}</p>
                ${dueDateHtml}
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${paymentLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 700; border-radius: 8px; transition: background-color 0.2s;">
                    View & Pay Invoice
                </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
                This payment request was sent through Verihub.<br>Payments are processed securely through Stripe.
            </p>
        </div>
    `;

    return sendEmail({ to, subject, html });
}

export async function sendInvoiceReminderEmail(options: { 
    to: string, 
    businessName: string, 
    invoiceNumber: string, 
    remainingBalance: number, 
    dueDate?: string | null, 
    paymentLink: string, 
    customMessage?: string 
}) {
    const { to, businessName, invoiceNumber, remainingBalance, dueDate, paymentLink, customMessage } = options;
    const subject = `Reminder: Invoice #${invoiceNumber} payment request`;
    
    const dueDateHtml = dueDate ? `<p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Due Date: <strong>${new Date(dueDate).toLocaleDateString()}</strong></p>` : '';
    const customMessageHtml = customMessage ? `<div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #f59e0b; margin-bottom: 24px; border-radius: 4px;"><p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">"${customMessage}"</p></div>` : '';

    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #111827; font-size: 20px; margin: 0;">${businessName}</h1>
            </div>
            
            <h2 style="color: #d97706; font-size: 24px; font-weight: 600; margin-bottom: 16px; text-align: center;">Payment Reminder</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
                This is a polite reminder from ${businessName} regarding the outstanding balance on <strong>Invoice #${invoiceNumber}</strong>.
            </p>

            ${customMessageHtml}
            
            <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; border: 1px solid #fef3c7;">
                <p style="color: #b45309; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Remaining Balance</p>
                <p style="color: #92400e; font-size: 32px; font-weight: 900; margin: 5px 0;">$${remainingBalance.toFixed(2)}</p>
                ${dueDateHtml}
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${paymentLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 700; border-radius: 8px; transition: background-color 0.2s;">
                    View & Pay Invoice
                </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
                This payment reminder was sent through Verihub.<br>Payments are processed securely through Stripe.
            </p>
        </div>
    `;

    return sendEmail({ to, subject, html });
}

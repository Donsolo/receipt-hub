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

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export interface AgingDigestData {
    to: string;
    ownerName: string;
    totalOutstanding: number;
    unpaidCount: number;
    partialCount: number;
    buckets: {
        current: number;
        days1to15: number;
        days16to30: number;
        days31to60: number;
        days60Plus: number;
    };
    topInvoices: Array<{
        invoiceNumber: string;
        clientName: string;
        balance: number;
    }>;
}

export async function sendAgingDigestEmail(data: AgingDigestData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('EMAIL_USER or EMAIL_PASS not set, skipping actual email send.');
        return;
    }

    const {
        to,
        ownerName,
        totalOutstanding,
        unpaidCount,
        partialCount,
        buckets,
        topInvoices
    } = data;

    const fromAddress = process.env.VERIHUB_EMAIL_FROM || 'Verihub <verihub@tektriq.com>';
    const totalCount = unpaidCount + partialCount;

    const topInvoicesHtml = topInvoices.map(inv => 
        `<li><strong>${inv.invoiceNumber || 'Invoice'} (${inv.clientName}):</strong> $${inv.balance.toFixed(2)}</li>`
    ).join('');

    const html = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
        <h1 style="color: #4F46E5;">Verihub Invoice Aging Digest</h1>
        <p>Hi ${ownerName || 'User'},</p>
        <p>Here is your summary of outstanding invoices. You currently have <strong>${totalCount}</strong> open invoices with a total outstanding balance of <strong>$${totalOutstanding.toFixed(2)}</strong>.</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Aging Summary</h3>
            <ul style="list-style: none; padding: 0;">
                <li><strong>Current (Not Overdue):</strong> $${buckets.current.toFixed(2)}</li>
                <li><strong>1-15 Days Overdue:</strong> $${buckets.days1to15.toFixed(2)}</li>
                <li><strong>16-30 Days Overdue:</strong> $${buckets.days16to30.toFixed(2)}</li>
                <li><strong>31-60 Days Overdue:</strong> $${buckets.days31to60.toFixed(2)}</li>
                <li><strong style="color: #dc2626;">60+ Days Overdue:</strong> $${buckets.days60Plus.toFixed(2)}</li>
            </ul>
        </div>

        ${topInvoices.length > 0 ? `
        <div style="margin: 20px 0;">
            <h3>Top 5 Overdue Invoices</h3>
            <ul>
                ${topInvoicesHtml}
            </ul>
        </div>
        ` : ''}

        <p>To follow up on these and review full details, please visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/aging" style="color: #4F46E5;">Invoice Aging Dashboard</a>.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
            Sent automatically by Verihub. You can manage these digests in your settings.
        </p>
    </div>
    `;

    const mailOptions = {
        from: fromAddress,
        to,
        subject: `Weekly Aging Digest: $${totalOutstanding.toFixed(2)} Outstanding`,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Failed to send aging digest email:', error);
    }
}

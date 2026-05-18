import { db as prisma } from '@/lib/db';

/**
 * Safely converts an Invoice into a Receipt.
 * Idempotent: Returns the existing convertedReceiptId if already converted.
 * Used for both manual dashboard conversion and automatic webhook conversion.
 */
export async function convertInvoiceToReceipt(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { items: true }
        });

        if (!invoice) {
            throw new Error(`Invoice ${invoiceId} not found`);
        }

        // Idempotency check: Already converted
        if (invoice.isConverted && invoice.convertedReceiptId) {
            return {
                success: true,
                receiptId: invoice.convertedReceiptId,
                invoiceId: invoice.id,
                message: 'Invoice was already converted'
            };
        }

        if (invoice.status !== 'PAID') {
            throw new Error(`Only PAID invoices can be converted. Current status: ${invoice.status}`);
        }

        // Check if a receipt already exists with this sourceInvoiceId
        const existingReceipt = await prisma.receipt.findFirst({
            where: { sourceInvoiceId: invoice.id }
        });

        if (existingReceipt) {
            // Fix broken link if it somehow happened
            if (!invoice.isConverted) {
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        isConverted: true,
                        convertedReceiptId: existingReceipt.id
                    }
                });
            }
            return {
                success: true,
                receiptId: existingReceipt.id,
                invoiceId: invoice.id,
                message: 'Recovered existing receipt'
            };
        }

        // Perform atomic conversion transaction
        const result = await prisma.$transaction(async (tx) => {
            let paymentHistoryStr = '';
            if (invoice.payments && Array.isArray(invoice.payments) && invoice.payments.length > 0) {
                paymentHistoryStr = '\n\nPayment History:\n' + invoice.payments.map((p: any) => 
                    `- $${Number(p.amount).toFixed(2)} via ${p.method} on ${p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}`
                ).join('\n');
            } else if (invoice.paymentMethod) {
                paymentHistoryStr = `\n\nPaid via: ${invoice.paymentMethod}`;
            }

            // Create the new Receipt
            const newReceipt = await tx.receipt.create({
                data: {
                    userId: invoice.userId,
                    date: invoice.paymentConfirmedAt || invoice.lastPaymentAt || invoice.issueDate,
                    clientName: invoice.clientName,
                    notes: `Converted from Invoice: ${invoice.title}${paymentHistoryStr}`,
                    taxType: invoice.tax && invoice.tax > 0 ? 'custom' : 'none',
                    taxValue: invoice.tax || 0,
                    subtotal: invoice.subtotal,
                    total: invoice.total,
                    sourceType: 'invoice_conversion',
                    sourceInvoiceId: invoice.id,
                    items: {
                        create: invoice.items.map(item => ({
                            description: item.name,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            lineTotal: item.total
                        }))
                    }
                }
            });

            // Lock the invoice
            const lockedInvoice = await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    isConverted: true,
                    convertedReceiptId: newReceipt.id
                }
            });

            return { receipt: newReceipt, invoice: lockedInvoice };
        });

        return { 
            success: true, 
            receiptId: result.receipt.id, 
            invoiceId: result.invoice.id 
        };

    } catch (error: any) {
        console.error('Invoice Conversion Error:', error);
        return { success: false, error: error.message || 'Failed to convert invoice' };
    }
}

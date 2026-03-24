import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        // 1. Fetch the invoice with items
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        // 2. Validate conversion constraints
        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Invoice is already converted' }, { status: 400 });
        }
        if (invoice.status !== 'PAID') {
            return NextResponse.json({ success: false, error: 'Only PAID invoices can be converted' }, { status: 400 });
        }

        // 3. Perform atomic conversion transaction
        const result = await prisma.$transaction(async (tx) => {
            
            // Create the new Receipt
            const newReceipt = await tx.receipt.create({
                data: {
                    userId: invoice.userId,
                    date: invoice.issueDate,
                    clientName: invoice.clientName,
                    notes: `Converted from Invoice: ${invoice.title}`,
                    taxType: invoice.tax && invoice.tax > 0 ? 'custom' : 'none',
                    taxValue: invoice.tax || 0,
                    subtotal: invoice.subtotal,
                    total: invoice.total,
                    sourceType: 'invoice_conversion',
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

        return NextResponse.json({ 
            success: true, 
            receiptId: result.receipt.id, 
            invoiceId: result.invoice.id 
        }, { status: 200 });

    } catch (error: any) {
        console.error('Invoice Conversion Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

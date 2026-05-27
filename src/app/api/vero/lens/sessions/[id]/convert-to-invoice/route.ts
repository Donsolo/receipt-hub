import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id },
            include: { lineItems: true }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        if (session.status !== 'SAVED' && session.status !== 'READY') {
            return new NextResponse('Session must be saved before converting.', { status: 400 });
        }

        if (session.lineItems.length === 0) {
            return new NextResponse('Cannot convert session with zero line items.', { status: 400 });
        }

        if (session.convertedInvoiceId) {
            return new NextResponse('Session already converted.', { status: 400 });
        }

        // Conservative pricing strategy
        const itemsToCreate = session.lineItems.map(item => {
            const unitPrice = item.unitPrice ?? item.estimatedPriceHigh ?? item.estimatedPriceLow ?? 0;
            const total = item.quantity * unitPrice;
            const baseDesc = item.description ? item.description + '\n\n' : '';
            return {
                name: item.title || 'Item',
                description: baseDesc + 'Generated from Vero Lens — review before sending.',
                quantity: item.quantity,
                unitPrice,
                total
            };
        });

        const subtotal = itemsToCreate.reduce((sum, item) => sum + item.total, 0);

        // Generate simple invoice number
        const count = await db.invoice.count({ where: { userId: user.id } });
        const invoiceNumber = `LENS-${(count + 1).toString().padStart(4, '0')}`;

        const invoice = await db.invoice.create({
            data: {
                userId: user.id,
                invoiceNumber,
                clientName: 'New Client (Draft)',
                title: session.title || 'Vero Lens Estimate',
                notes: 'Generated from Vero AI Lens. Please review all AI-assisted line items and pricing before sending.',
                status: 'DRAFT',
                subtotal,
                total: subtotal,
                issueDate: new Date(),
                items: {
                    create: itemsToCreate
                }
            }
        });

        await db.veroLensSession.update({
            where: { id },
            data: { convertedInvoiceId: invoice.id }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'CONVERTED_TO_INVOICE',
                message: `Converted to Draft Invoice #${invoiceNumber}`
            }
        });

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('[VERO_LENS_CONVERT_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

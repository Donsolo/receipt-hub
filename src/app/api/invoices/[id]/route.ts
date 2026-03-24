import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        return NextResponse.json({ success: true, invoice }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Cannot update a converted invoice' }, { status: 400 });
        }

        const body = await req.json();
        const { clientName, clientEmail, clientCompany, clientPhone, clientAddress, clientPropertyAddress, title, description, currency, tax, issueDate, dueDate, notes, status, items } = body;

        let dataToUpdate: any = {};

        if (clientName !== undefined) dataToUpdate.clientName = clientName;
        if (clientEmail !== undefined) dataToUpdate.clientEmail = clientEmail || null;
        if (clientCompany !== undefined) dataToUpdate.clientCompany = clientCompany || null;
        if (clientPhone !== undefined) dataToUpdate.clientPhone = clientPhone || null;
        if (clientAddress !== undefined) dataToUpdate.clientAddress = clientAddress || null;
        if (clientPropertyAddress !== undefined) dataToUpdate.clientPropertyAddress = clientPropertyAddress || null;
        if (title !== undefined) dataToUpdate.title = title;
        if (description !== undefined) dataToUpdate.description = description || null;
        if (currency !== undefined) dataToUpdate.currency = currency || "USD";
        if (issueDate !== undefined) dataToUpdate.issueDate = new Date(issueDate);
        if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
        if (notes !== undefined) dataToUpdate.notes = notes || null;
        if (status !== undefined) dataToUpdate.status = status;

        // Handle mathematical items payload enforcement
        if (items && Array.isArray(items)) {
            let calculatedSubtotal = 0;
            const newItems = items.map((item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const lineTotal = qty * price;
                calculatedSubtotal += lineTotal;
                return {
                    name: item.name || "Item",
                    description: item.description || null,
                    quantity: qty,
                    unitPrice: price,
                    total: lineTotal
                };
            });

            const calculatedTax = tax !== undefined ? Number(tax) : Number(invoice.tax || 0);
            const calculatedTotal = calculatedSubtotal + calculatedTax;

            dataToUpdate.subtotal = calculatedSubtotal;
            dataToUpdate.tax = calculatedTax;
            dataToUpdate.total = calculatedTotal;

            // Delete old items and replace with new ones
            await prisma.invoiceLineItem.deleteMany({
                where: { invoiceId: invoice.id }
            });
            
            dataToUpdate.items = {
                create: newItems
            };
        } else if (tax !== undefined) {
             // Only updating tax without items
             const currentSubtotal = invoice.subtotal;
             const newTax = Number(tax);
             dataToUpdate.tax = newTax;
             dataToUpdate.total = currentSubtotal + newTax;
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: dataToUpdate,
            include: { items: true }
        });

        return NextResponse.json({ success: true, invoice: updatedInvoice }, { status: 200 });

    } catch (error: any) {
        console.error('Update Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Cannot delete a converted invoice' }, { status: 400 });
        }
        if (invoice.status === 'PAID') {
            return NextResponse.json({ success: false, error: 'Cannot delete a PAID invoice' }, { status: 400 });
        }

        await prisma.invoice.delete({
            where: { id: invoice.id }
        });

        return NextResponse.json({ success: true, deletedId: invoice.id }, { status: 200 });
    } catch (error: any) {
        console.error('Delete Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

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
            include: { items: true, installments: true }
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
        const { customerContactId, clientName, clientEmail, clientCompany, clientPhone, clientAddress, clientPropertyAddress, title, description, currency, tax, discountType, discountValue, issueDate, dueDate, notes, status, attachedPhotos, items, depositAmount, paymentMethod, payments, acceptOnlinePayment, miscTitle, miscItems, miscTaxValue, miscDiscountType, miscDiscountValue } = body;

        let dataToUpdate: any = {};
        
        if (customerContactId !== undefined) dataToUpdate.customerContactId = customerContactId || null;

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
        if (status !== undefined) {
            const STATUS_RANKS: Record<string, number> = { CANCELLED: -1, DRAFT: 0, SENT: 1, VIEWED: 2, PAID: 3 };
            const currentRank = STATUS_RANKS[invoice.status] ?? 0;
            const newRank = STATUS_RANKS[status] ?? 0;

            // Prevent backward status transitions. PAID is terminal. CANCELLED is allowed unless PAID.
            if (status === 'CANCELLED' && invoice.status !== 'PAID') {
                dataToUpdate.status = status;
            } else if (newRank >= currentRank) {
                dataToUpdate.status = status;
                if (status === 'SENT' && invoice.status !== 'SENT' && !invoice.sentAt) {
                    dataToUpdate.sentAt = new Date();
                }
            }
        }

        if (discountType !== undefined) dataToUpdate.discountType = discountType;
        if (discountValue !== undefined) dataToUpdate.discountValue = Number(discountValue) || 0;
        if (miscTitle !== undefined) dataToUpdate.miscTitle = miscTitle || "Miscellaneous";
        if (miscDiscountType !== undefined) dataToUpdate.miscDiscountType = miscDiscountType;
        if (miscDiscountValue !== undefined) dataToUpdate.miscDiscountValue = Number(miscDiscountValue) || 0;
        if (depositAmount !== undefined) dataToUpdate.depositAmount = Number(depositAmount) || 0;
        if (paymentMethod !== undefined) dataToUpdate.paymentMethod = paymentMethod || null;
        if (payments !== undefined && Array.isArray(payments)) dataToUpdate.payments = payments;
        
        if (acceptOnlinePayment !== undefined) {
            const isPro = (user.plan === "PRO" && user.planStatus !== "inactive") || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
            if (!isPro && acceptOnlinePayment === true) {
                return NextResponse.json({ success: false, error: 'Pro plan required to enable online payments.' }, { status: 403 });
            }
            if (acceptOnlinePayment === true) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
                if (!dbUser?.connectChargesEnabled) {
                    return NextResponse.json({ success: false, error: 'You must set up payments before enabling online payments.' }, { status: 403 });
                }
            }
            dataToUpdate.acceptOnlinePayment = acceptOnlinePayment;
            if (acceptOnlinePayment && !invoice.paymentEnabledAt) {
                dataToUpdate.paymentEnabledAt = new Date();
            }
        }
        
        if (attachedPhotos !== undefined && Array.isArray(attachedPhotos)) dataToUpdate.attachedPhotos = attachedPhotos;

        // Handle mathematical items payload enforcement
        if ((items && Array.isArray(items)) || (miscItems && Array.isArray(miscItems))) {
            const processItemsList = items && Array.isArray(items) ? items : invoice.items.filter((i: any) => i.type === 'MAIN');
            const processMiscItemsList = miscItems && Array.isArray(miscItems) ? miscItems : invoice.items.filter((i: any) => i.type === 'MISC');

            let calculatedSubtotal = 0;
            const newItems = processItemsList.map((item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const lineTotal = qty * price;
                calculatedSubtotal += lineTotal;
                return {
                    name: item.name || "Item",
                    description: item.description || null,
                    quantity: qty,
                    unitPrice: price,
                    total: lineTotal,
                    type: 'MAIN'
                };
            });

            let calculatedMiscSubtotal = 0;
            const newMiscItems = processMiscItemsList.map((item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const lineTotal = qty * price;
                calculatedMiscSubtotal += lineTotal;
                return {
                    name: item.name || "Item",
                    description: item.description || null,
                    quantity: qty,
                    unitPrice: price,
                    total: lineTotal,
                    type: 'MISC'
                };
            });

            let activeDiscountType = dataToUpdate.discountType ?? invoice.discountType;
            let activeDiscountValue = dataToUpdate.discountValue !== undefined ? dataToUpdate.discountValue : invoice.discountValue;

            let calculatedDiscount = 0;
            if (activeDiscountType === "percent") {
                calculatedDiscount = calculatedSubtotal * ((activeDiscountValue || 0) / 100);
            } else if (activeDiscountType === "flat") {
                calculatedDiscount = activeDiscountValue || 0;
            }

            const subtotalAfterDiscount = Math.max(0, calculatedSubtotal - calculatedDiscount);
            const calculatedTax = tax !== undefined ? Number(tax) : Number(invoice.tax || 0);
            const mainTotal = subtotalAfterDiscount + calculatedTax;

            let activeMiscDiscountType = dataToUpdate.miscDiscountType ?? invoice.miscDiscountType;
            let activeMiscDiscountValue = dataToUpdate.miscDiscountValue !== undefined ? dataToUpdate.miscDiscountValue : invoice.miscDiscountValue;

            let calculatedMiscDiscount = 0;
            if (activeMiscDiscountType === "percent") {
                calculatedMiscDiscount = calculatedMiscSubtotal * ((activeMiscDiscountValue || 0) / 100);
            } else if (activeMiscDiscountType === "flat") {
                calculatedMiscDiscount = activeMiscDiscountValue || 0;
            }

            const miscSubtotalAfterDiscount = Math.max(0, calculatedMiscSubtotal - calculatedMiscDiscount);
            const calculatedMiscTax = miscTaxValue !== undefined ? Number(miscTaxValue) : Number(invoice.miscTaxValue || 0);
            const calculatedMiscTotal = miscSubtotalAfterDiscount + calculatedMiscTax;

            dataToUpdate.subtotal = calculatedSubtotal;
            dataToUpdate.tax = calculatedTax;
            dataToUpdate.miscSubtotal = calculatedMiscSubtotal;
            dataToUpdate.miscTaxValue = calculatedMiscTax;
            dataToUpdate.miscTotal = calculatedMiscTotal;
            dataToUpdate.total = mainTotal + calculatedMiscTotal;

            // Delete old items and replace with new ones
            await prisma.invoiceLineItem.deleteMany({
                where: { invoiceId: invoice.id }
            });
            
            dataToUpdate.items = {
                create: [...newItems, ...newMiscItems]
            };
        } else if (tax !== undefined || miscTaxValue !== undefined) {
             // Only updating tax without items
             const calculatedTax = tax !== undefined ? Number(tax) : Number(invoice.tax || 0);
             const calculatedMiscTax = miscTaxValue !== undefined ? Number(miscTaxValue) : Number(invoice.miscTaxValue || 0);
             
             // Recompute main total
             let activeDiscountType = dataToUpdate.discountType ?? invoice.discountType;
             let activeDiscountValue = dataToUpdate.discountValue !== undefined ? dataToUpdate.discountValue : invoice.discountValue;
             let calculatedDiscount = 0;
             if (activeDiscountType === "percent") calculatedDiscount = invoice.subtotal * ((activeDiscountValue || 0) / 100);
             else if (activeDiscountType === "flat") calculatedDiscount = activeDiscountValue || 0;
             const mainTotal = Math.max(0, invoice.subtotal - calculatedDiscount) + calculatedTax;

             // Recompute misc total
             let activeMiscDiscountType = dataToUpdate.miscDiscountType ?? invoice.miscDiscountType;
             let activeMiscDiscountValue = dataToUpdate.miscDiscountValue !== undefined ? dataToUpdate.miscDiscountValue : invoice.miscDiscountValue;
             let calculatedMiscDiscount = 0;
             if (activeMiscDiscountType === "percent") calculatedMiscDiscount = invoice.miscSubtotal * ((activeMiscDiscountValue || 0) / 100);
             else if (activeMiscDiscountType === "flat") calculatedMiscDiscount = activeMiscDiscountValue || 0;
             const miscTotal = Math.max(0, invoice.miscSubtotal - calculatedMiscDiscount) + calculatedMiscTax;

             dataToUpdate.tax = calculatedTax;
             dataToUpdate.miscTaxValue = calculatedMiscTax;
             dataToUpdate.miscTotal = miscTotal;
             dataToUpdate.total = mainTotal + miscTotal;
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: dataToUpdate,
            include: { items: true }
        });

        // Sync payments[] to InvoiceInstallment
        if (payments !== undefined && Array.isArray(payments) && payments.length > 0) {
            const currentTotal = dataToUpdate.total !== undefined ? dataToUpdate.total : invoice.total;
            const paymentsSum = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
            if (Math.abs(paymentsSum - currentTotal) < 0.01) {
                // Delete existing unpaid installments
                await prisma.invoiceInstallment.deleteMany({
                    where: { invoiceId: invoice.id, status: { not: 'PAID' } }
                });
                
                // Create new installments mapping
                const installmentData = payments.map((p: any) => ({
                    invoiceId: invoice.id,
                    label: p.note || (p.isDeposit ? 'Deposit' : 'Payment'),
                    amount: Number(p.amount) || 0,
                    dueDate: p.date ? new Date(p.date) : null,
                    status: 'UNPAID'
                }));

                await prisma.invoiceInstallment.createMany({
                    data: installmentData
                });

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: { paymentPlanEnabled: true }
                });
            }
        }

        revalidatePath('/dashboard/invoices');
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

        revalidatePath('/dashboard/invoices');
        return NextResponse.json({ success: true, deletedId: invoice.id }, { status: 200 });
    } catch (error: any) {
        console.error('Delete Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

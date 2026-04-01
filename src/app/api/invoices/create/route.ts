import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getNextSequenceData } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { clientName, clientEmail, clientCompany, clientPhone, clientAddress, clientPropertyAddress, title, description, currency, tax, issueDate, dueDate, notes, items } = body;

        if (!clientName || !title || !issueDate || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields or items' }, { status: 400 });
        }

        // Server-Side Math Calculation (Never trust client)
        let calculatedSubtotal = 0;
        const processedItems = items.map((item: any) => {
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

        const calculatedTax = Number(tax) || 0;
        const calculatedTotal = calculatedSubtotal + calculatedTax;

        // Generate Document Sequence Number
        const seqData = await getNextSequenceData(user.userId, 'INVOICE');

        // Generate safe 30-day URL Token
        const tokenValue = crypto.randomUUID();
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const invoice = await prisma.invoice.create({
            data: {
                userId: user.userId,
                invoiceNumber: seqData.documentNumber,
                sequenceNumber: seqData.sequenceNumber,
                clientName,
                clientEmail: clientEmail || null,
                clientCompany: clientCompany || null,
                clientPhone: clientPhone || null,
                clientAddress: clientAddress || null,
                clientPropertyAddress: clientPropertyAddress || null,
                title,
                description: description || null,
                currency: currency || "USD",
                subtotal: calculatedSubtotal,
                tax: calculatedTax,
                total: calculatedTotal,
                issueDate: new Date(issueDate),
                dueDate: dueDate ? new Date(dueDate) : null,
                notes: notes || null,
                status: 'DRAFT', // Defaults to DRAFT
                publicToken: tokenValue,
                publicTokenExpiresAt: expirationDate,
                items: {
                    create: processedItems
                }
            },
            include: {
                items: true
            }
        });

        revalidatePath('/dashboard/invoices');
        return NextResponse.json({ success: true, invoice }, { status: 201 });
    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

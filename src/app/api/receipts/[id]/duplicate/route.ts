import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

function generateReceiptNumber(date: Date, lastNumber?: string) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `RH-${dateStr}-`;
    if (lastNumber && lastNumber.startsWith(prefix)) {
        const lastNum = parseInt(lastNumber.split("-").pop() || "0", 10);
        return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
    }
    return `${prefix}0001`;
}

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const original = await db.receipt.findUnique({
            where: {
                id: params.id,
                userId: user.userId,
            },
            include: {
                items: true,
            }
        });

        if (!original) {
            return NextResponse.json({ error: 'Receipt not found or unauthorized' }, { status: 404 });
        }

        let newReceiptNumber = null;
        if (original.receiptNumber) {
            const lastReceipt = await db.receipt.findFirst({
                where: { receiptNumber: { startsWith: `RH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-` } },
                orderBy: { receiptNumber: "desc" },
            });
            newReceiptNumber = generateReceiptNumber(new Date(), lastReceipt?.receiptNumber || undefined);
        }

        const duplicatedReceipt = await db.receipt.create({
            data: {
                userId: user.userId,
                receiptNumber: newReceiptNumber,
                categoryId: original.categoryId,
                imageUrl: original.imageUrl,
                date: original.date,
                clientName: original.clientName,
                notes: original.notes,
                taxType: original.taxType,
                taxValue: original.taxValue,
                subtotal: original.subtotal,
                total: original.total,
                isFinalized: false,
                finalizedAt: null,
                parentReceiptId: original.id,
                versionNumber: original.versionNumber + 1,
                items: {
                    create: original.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        lineTotal: item.lineTotal,
                    }))
                }
            },
        });

        return NextResponse.json(duplicatedReceipt);
    } catch (error) {
        console.error('Duplicate Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

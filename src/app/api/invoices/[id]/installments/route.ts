import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = (request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0] || (request.headers.get('authorization')?.startsWith('Bearer ') ? request.headers.get('authorization')?.substring(7) : undefined));
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const sender = await db.user.findUnique({ where: { id: user.userId } });
        const isPro = (sender?.plan === 'PRO' && sender?.planStatus !== 'inactive') || sender?.role === 'ADMIN' || sender?.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Payment plans are a Pro feature.' }, { status: 403 });
        }

        const invoice = await db.invoice.findUnique({
            where: { id },
            include: { installments: true }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot modify payment plan for a fully paid invoice' }, { status: 400 });

        const body = await request.json();
        const { paymentPlanEnabled, installments } = body;

        // If disabling the plan, check if any installments are already paid
        if (!paymentPlanEnabled) {
            const hasPaidInstallments = invoice.installments.some(inst => inst.status === 'PAID');
            if (hasPaidInstallments) {
                return NextResponse.json({ error: 'Cannot disable payment plan because some installments are already paid.' }, { status: 400 });
            }

            // Safe to delete all and disable
            await db.$transaction([
                db.invoiceInstallment.deleteMany({ where: { invoiceId: id } }),
                db.invoice.update({ where: { id }, data: { paymentPlanEnabled: false } })
            ]);

            return NextResponse.json({ success: true, installments: [] });
        }

        // Validate installments
        if (!Array.isArray(installments) || installments.length === 0) {
            return NextResponse.json({ error: 'Installments array cannot be empty when plan is enabled.' }, { status: 400 });
        }

        const sumOfInstallments = installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0);
        // We compare to invoice total. If they've already paid some non-installment amount, we might need to handle differently, 
        // but typically installments should sum to invoice total.
        const EPSILON = 0.01;
        if (Math.abs(sumOfInstallments - invoice.total) > EPSILON) {
            return NextResponse.json({ error: `Sum of installments ($${sumOfInstallments.toFixed(2)}) must equal invoice total ($${invoice.total.toFixed(2)}).` }, { status: 400 });
        }

        // We will process this in a transaction:
        // 1. Update existing unpaid installments, or delete removed unpaid ones.
        // 2. Create new installments.
        // 3. Keep PAID ones completely untouched.

        const existingInstallments = invoice.installments;
        const paidInstallmentIds = existingInstallments.filter(i => i.status === 'PAID').map(i => i.id);

        const incomingIds = installments.map(i => i.id).filter(Boolean);

        // Make sure no paid installment was removed or modified in amount
        for (const paidId of paidInstallmentIds) {
            const match = installments.find(i => i.id === paidId);
            if (!match) return NextResponse.json({ error: 'Cannot remove a paid installment.' }, { status: 400 });
            const original = existingInstallments.find(i => i.id === paidId);
            if (original && Math.abs(Number(match.amount) - Number(original.amount)) > EPSILON) {
                return NextResponse.json({ error: 'Cannot change the amount of a paid installment.' }, { status: 400 });
            }
        }

        // Find which existing unpaid ones to delete
        const toDeleteIds = existingInstallments
            .filter(i => i.status !== 'PAID' && !incomingIds.includes(i.id))
            .map(i => i.id);

        await db.$transaction(async (tx) => {
            // Delete removed unpaid installments
            if (toDeleteIds.length > 0) {
                await tx.invoiceInstallment.deleteMany({ where: { id: { in: toDeleteIds } } });
            }

            // Upsert incoming installments
            for (const inst of installments) {
                if (inst.id && existingInstallments.some(e => e.id === inst.id)) {
                    // Update (only if not paid, or if paid we only allow label/dueDate changes conceptually, but let's be safe)
                    const existing = existingInstallments.find(e => e.id === inst.id);
                    if (existing?.status !== 'PAID') {
                        await tx.invoiceInstallment.update({
                            where: { id: inst.id },
                            data: {
                                label: inst.label || null,
                                amount: Number(inst.amount),
                                dueDate: inst.dueDate ? new Date(inst.dueDate) : null
                            }
                        });
                    } else {
                        // Allow updating label and due date for paid items, but strictly ignore amount changes
                        await tx.invoiceInstallment.update({
                            where: { id: inst.id },
                            data: {
                                label: inst.label || null,
                                dueDate: inst.dueDate ? new Date(inst.dueDate) : null
                            }
                        });
                    }
                } else {
                    // Create new
                    await tx.invoiceInstallment.create({
                        data: {
                            invoiceId: id,
                            label: inst.label || null,
                            amount: Number(inst.amount),
                            dueDate: inst.dueDate ? new Date(inst.dueDate) : null
                        }
                    });
                }
            }

            // Enable plan
            await tx.invoice.update({
                where: { id },
                data: { paymentPlanEnabled: true }
            });
        });

        // Fetch the fresh list to return
        const freshInstallments = await db.invoiceInstallment.findMany({
            where: { invoiceId: id },
            orderBy: { createdAt: 'asc' } // Or by due date
        });

        return NextResponse.json({ success: true, installments: freshInstallments });

    } catch (error: any) {
        console.error('Failed to update installments:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

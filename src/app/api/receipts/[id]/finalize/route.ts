import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

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

        const existingReceipt = await db.receipt.findUnique({
            where: {
                id: params.id,
                userId: user.userId,
            }
        });

        if (!existingReceipt) {
            return NextResponse.json({ error: 'Receipt not found or unauthorized' }, { status: 404 });
        }

        if (existingReceipt.isFinalized) {
            return NextResponse.json({ error: 'This receipt is already finalized.' }, { status: 400 });
        }

        const updatedReceipt = await db.receipt.update({
            where: { id: params.id },
            data: {
                isFinalized: true,
                finalizedAt: new Date(),
            },
        });

        return NextResponse.json(updatedReceipt);
    } catch (error) {
        console.error('Finalize Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

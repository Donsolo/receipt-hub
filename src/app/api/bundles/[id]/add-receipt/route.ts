import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: bundleId } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { receiptId } = body;

        if (!receiptId) {
            return NextResponse.json({ error: 'Receipt ID is required' }, { status: 400 });
        }

        // Security check: Must own bundle
        const existingBundle = await (db as any).bundle.findUnique({ where: { id: bundleId } });
        if (!existingBundle || existingBundle.userId !== user.userId) {
            return NextResponse.json({ error: 'Bundle not found or unauthorized' }, { status: 403 });
        }

        // Security check: Must own receipt
        const existingReceipt = await (db as any).receipt.findUnique({ where: { id: receiptId } });
        if (!existingReceipt || existingReceipt.userId !== user.userId) {
            return NextResponse.json({ error: 'Receipt not found or unauthorized' }, { status: 403 });
        }

        // Prevent duplicate addition (Prisma handles @@unique but it's cleaner to check payload or rely on catch block)
        try {
            const added = await (db as any).bundleReceipt.create({
                data: {
                    bundleId,
                    receiptId
                }
            });
            return NextResponse.json(added);
        } catch (dbError: any) {
            if (dbError.code === 'P2002') {
                return NextResponse.json({ error: 'Receipt is already in this bundle.' }, { status: 400 });
            }
            throw dbError;
        }

    } catch (error) {
        console.error('Failed to add receipt to bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

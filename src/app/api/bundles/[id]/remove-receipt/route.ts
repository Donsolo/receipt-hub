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

        // We delete by compound unique ID
        await (db as any).bundleReceipt.deleteMany({
            where: {
                bundleId,
                receiptId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to remove receipt from bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
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

        const body = await request.json(); // DELETE with body can be problematic in some clients but fetch supports it. Using URL query is safer, but we can accept both.
        // Let's use searchParams to be safe for DELETE
        const url = new URL(request.url);
        const receiptId = url.searchParams.get('receiptId');

        if (!receiptId) {
            return NextResponse.json({ error: 'Receipt ID query param is required' }, { status: 400 });
        }

        // Security check: Must own bundle
        const existingBundle = await (db as any).bundle.findUnique({ where: { id: bundleId } });
        if (!existingBundle || existingBundle.userId !== user.userId) {
            return NextResponse.json({ error: 'Bundle not found or unauthorized' }, { status: 403 });
        }

        await (db as any).bundleReceipt.deleteMany({
            where: {
                bundleId,
                receiptId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to remove receipt from bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

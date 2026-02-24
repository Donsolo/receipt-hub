import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const bundles = await (db as any).bundle.findMany({
            where: { userId: user.userId },
            include: {
                receipts: {
                    include: {
                        receipt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Compute receipt count and total combined amount for each bundle on the fly
        const mappedBundles = bundles.map((bundle: any) => {
            const receiptCount = bundle.receipts.length;
            const totalAmount = bundle.receipts.reduce((sum: number, br: any) => sum + (br.receipt?.total || 0), 0);

            return {
                ...bundle,
                receiptCount,
                totalAmount
            };
        });

        return NextResponse.json(mappedBundles);
    } catch (error: any) {
        console.error('Failed to fetch bundles:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { name, description } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Bundle name is required' }, { status: 400 });
        }

        const bundle = await (db as any).bundle.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                userId: user.userId
            }
        });

        return NextResponse.json(bundle);
    } catch (error) {
        console.error('Failed to create bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

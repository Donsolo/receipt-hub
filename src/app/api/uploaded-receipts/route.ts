







import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { imageUrl } = body;

        // Strict validation: Only accept uploads for this route
        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        /* FORCE UPDATE: DATE INCLUDED */
        const receipt = await db.receipt.create({
            data: {
                userId: user.userId,
                imageUrl,
                date: new Date(),
            },
        });

        return NextResponse.json(receipt);
    } catch (error) {
        console.error('Create Uploaded Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        // Fetch ONLY uploaded receipts (imageUrl present, NO receiptNumber)
        const receipts = await db.receipt.findMany({
            where: {
                userId: user.userId,
                imageUrl: { not: null },
                receiptNumber: null as any,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(receipts);
    } catch (error) {
        console.error('Fetch Uploaded Receipts Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

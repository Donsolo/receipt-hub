import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tokenString = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!tokenString) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(tokenString);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const invoice = await db.invoice.findFirst({
            where: { id, userId: user.userId }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found or unauthorized' }, { status: 404 });
        }

        if (invoice.publicToken) {
            return NextResponse.json({ success: true, token: invoice.publicToken });
        }

        const newToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.invoice.update({
            where: { id },
            data: {
                publicToken: newToken,
                publicTokenExpiresAt: expiresAt
            }
        });

        return NextResponse.json({ success: true, token: newToken });

    } catch (error) {
        console.error('Generate token error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

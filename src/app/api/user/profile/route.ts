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

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const profile = await db.user.findUnique({
            where: { id: user.userId },
            select: { email: true, createdAt: true, ...({ name: true, businessName: true, businessPhone: true, businessAddress: true } as any) }
        });

        if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json(profile);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { name, businessName, businessPhone, businessAddress } = body;

        const updatedUser = await db.user.update({
            where: { id: user.userId },
            data: {
                ...({
                    name: name || null,
                    businessName: businessName || null,
                    businessPhone: businessPhone || null,
                    businessAddress: businessAddress || null,
                } as any)
            },
            select: {
                id: true,
                email: true,
                ...({ name: true, businessName: true, businessPhone: true, businessAddress: true } as any)
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

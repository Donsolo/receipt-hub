import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const profile = await db.user.findUnique({
            where: { id: user.userId },
            select: { email: true, createdAt: true, ...({ businessName: true, businessPhone: true, businessAddress: true } as any) }
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

        const body = await request.json();
        const { businessName, businessPhone, businessAddress } = body;

        const updatedUser = await db.user.update({
            where: { id: user.userId },
            data: {
                businessName: businessName || null,
                businessPhone: businessPhone || null,
                businessAddress: businessAddress || null,
            } as any,
            select: {
                id: true,
                email: true,
                ...({ businessName: true, businessPhone: true, businessAddress: true } as any)
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

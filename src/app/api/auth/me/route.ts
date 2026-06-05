import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const payload = await getCurrentUser();

    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await (db as any).user.findUnique({
        where: { id: payload.id },
        select: {
            id: true,
            email: true,
            role: true,
            name: true,
            businessName: true,
            businessLogoPath: true,
            businessRegistrationNumber: true,
            plan: true,
            planStatus: true
        }
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}

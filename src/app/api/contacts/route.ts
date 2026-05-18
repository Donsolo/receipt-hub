import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contacts = await db.customerContact.findMany({
            where: { ownerId: user.userId },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                company: true,
                addressLine1: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                source: true
            }
        });

        return NextResponse.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

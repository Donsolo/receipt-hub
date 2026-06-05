import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contacts = await db.customerContact.findMany({
            where: { ownerId: user.id },
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

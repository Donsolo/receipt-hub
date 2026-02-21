import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
        }

        const targetEmail = email.trim().toLowerCase();

        // Exact match only
        const result = await (db as any).user.findFirst({
            where: {
                email: targetEmail,
                id: { not: user.userId }, // Prevent self-lookup or finding self
                // Exclude if connection already exists
                sentConnections: {
                    none: { receiverId: user.userId }
                },
                receivedConnections: {
                    none: { requesterId: user.userId }
                }
            },
            select: {
                id: true,
                name: true,
                businessName: true,
                email: true, // Email is returned here as per requirements since it's an exact email search
            }
        });

        if (!result) {
            return NextResponse.json({ found: false });
        }

        return NextResponse.json({ found: true, user: result });
    } catch (error) {
        console.error('Email search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

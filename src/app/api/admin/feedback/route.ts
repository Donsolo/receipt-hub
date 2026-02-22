import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized Admin Access' }, { status: 403 });
        }

        const feedback = await db.feedback.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { email: true, name: true, businessName: true }
                }
            }
        });

        return NextResponse.json(feedback);
    } catch (error) {
        console.error('Failed to fetch admin feedback:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

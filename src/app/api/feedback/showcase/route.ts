import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const showcase = await db.feedback.findMany({
            where: {
                isShowcased: true,
                type: 'positive',
                isApproved: true
            },
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        businessName: true,
                        isEarlyAccess: true
                    }
                }
            }
        });

        return NextResponse.json(showcase);
    } catch (error) {
        console.error('Failed to fetch showcase feedback:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

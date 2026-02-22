import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized Admin Access' }, { status: 403 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await request.json();
        const { isApproved, isShowcased } = body;

        // Verify it exists
        const feedback = await db.feedback.findUnique({ where: { id } });
        if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });

        // Enforce constraint: only positive feedback can be showcased
        let finalShowcased = isShowcased;
        if (isShowcased === true && feedback.type !== 'positive') {
            finalShowcased = false;
        }

        const updated = await db.feedback.update({
            where: { id },
            data: {
                ...(isApproved !== undefined && { isApproved }),
                ...(finalShowcased !== undefined && { isShowcased: finalShowcased })
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update feedback:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

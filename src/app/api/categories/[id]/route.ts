import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Follow Next.js 15+ async params pattern as utilized elsewhere in the project if needed, or stick to standards. We will wait on the Promise context if required, or simply use `await params`
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureActivated(user);

        const category = await db.category.findUnique({
            where: { id }
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Only allow deleting custom categories belonging to the user
        if (category.userId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden. Cannot delete system categories or categories belonging to other users.' }, { status: 403 });
        }

        await db.category.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

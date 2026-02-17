import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('Admin Setup Route Accessed');
    try {
        const targetEmail = 'dariusreeder@gmail.com';

        const user = await db.user.findUnique({
            where: { email: targetEmail }
        });

        if (!user) {
            return NextResponse.json({ error: `User ${targetEmail} not found. Please register first.` }, { status: 404 });
        }

        const updatedUser = await db.user.update({
            where: { email: targetEmail },
            data: { role: 'SUPER_ADMIN' }
        });

        return NextResponse.json({
            success: true,
            message: `User ${updatedUser.email} has been promoted to ${updatedUser.role}.`,
            user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }
        });

    } catch (error) {
        console.error('Admin Setup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

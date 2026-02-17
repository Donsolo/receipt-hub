import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('Admin Setup Route Accessed');
    try {
        const targetEmail = 'dariusreeder@gmail.com';
        console.log(`Attempting to promote: ${targetEmail}`);

        const user = await db.user.findFirst({
            where: {
                email: {
                    equals: targetEmail,
                    mode: 'insensitive',
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: `User ${targetEmail} not found. Please register first.` }, { status: 404 });
        }

        const updatedUser = await db.user.update({
            where: { email: targetEmail },
            data: { role: 'SUPER_ADMIN' }
        });

        // REFRESH COOKIE IMMEDIATELY
        const token = await signToken({ userId: updatedUser.id, email: updatedUser.email, role: updatedUser.role });
        const cookie = createAuthCookie(token);

        const response = NextResponse.json({
            success: true,
            message: `User ${updatedUser.email} has been promoted to ${updatedUser.role}. Cookie refreshed.`,
            user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }
        });
        response.headers.set('Set-Cookie', cookie);

        return response;

    } catch (error) {
        console.error('Admin Setup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

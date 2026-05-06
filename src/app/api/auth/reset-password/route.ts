import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPasswordResetToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, token, newPassword } = body;

        if (!email || !token || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const userId = await verifyPasswordResetToken(token, user.password);

        if (!userId || userId !== user.id) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        // Token is valid, hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        // We always return success to prevent email enumeration attacks
        if (!user) {
            return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
        }

        const token = await createPasswordResetToken(user.id, user.password);
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

        const emailSent = await sendPasswordResetEmail(user.email, resetUrl);

        if (!emailSent) {
            console.error('Failed to send password reset email to', user.email);
            // In a production app, we still might want to return 200, but for clarity:
            return NextResponse.json({ error: 'Failed to send email. Please try again or contact support.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

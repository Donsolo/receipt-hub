import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { signToken, createAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { email, password } = body;

        email = email.toLowerCase();

        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Generate Token
        const token = await signToken({ userId: user.id, email: user.email, role: user.role, isActivated: (user as any).isActivated, isEarlyAccess: (user as any).isEarlyAccess, activationSource: (user as any).activationSource });

        // Set Cookie using shared helper
        const cookie = createAuthCookie(token);

        const response = NextResponse.json({ success: true, user: { email: user.email, role: user.role } });
        response.headers.set('Set-Cookie', cookie);

        return response;

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

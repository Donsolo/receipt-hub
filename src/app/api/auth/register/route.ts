import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { signToken, createAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { email, password, name, businessName } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        email = email.toLowerCase();

        // Check existing
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const role = email === 'Cp0165@yahoo.com' ? 'ADMIN' : 'USER';

        const newUser = await db.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                ...({
                    name: name?.trim() || null,
                    businessName: businessName?.trim() || null,
                } as any)
            },
        });

        // AUTO-LOGIN: Generate Token & Set Cookie
        const token = await signToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
        const cookie = createAuthCookie(token);

        const response = NextResponse.json({ success: true, message: 'User created successfully', user: { email: newUser.email, role: newUser.role } });
        response.headers.set('Set-Cookie', cookie);

        return response;
    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

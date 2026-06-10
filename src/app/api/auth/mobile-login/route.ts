import { NextResponse } from 'next/server';
import { createAuthCookie } from '@/lib/auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect') || '/dashboard';

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const cookie = createAuthCookie(token);
    const response = NextResponse.redirect(new URL(redirect, request.url));
    response.headers.set('Set-Cookie', cookie);
    return response;
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Protect Dashboard, Admin, Uploads, Generator & History routes
    const protectedPaths = ['/dashboard', '/admin', '/uploads', '/create', '/history', '/settings'];
    if (protectedPaths.some(path => pathname.startsWith(path))) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (pathname.startsWith('/admin')) {
            if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN') {
                console.log(`Middleware: Unauthorized Admin Access attempt by ${payload.email} (Role: ${payload.role})`);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    }

    // Redirect authenticated users away from auth pages
    if (pathname === '/login' || pathname === '/register') {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/register', '/uploads/:path*', '/create', '/history', '/settings'],
};

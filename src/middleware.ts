import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Protect Dashboard, Admin, Uploads, Generator & History routes
    const protectedPaths = ['/dashboard', '/admin', '/uploads', '/create', '/history', '/settings', '/activate', '/feedback'];
    if (protectedPaths.some(path => pathname.startsWith(path))) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Fetch dynamic settings instead of static constant
        let requireActivation = false;
        try {
            const baseUrl = request.nextUrl.origin;
            const res = await fetch(`${baseUrl}/api/settings/public`, { cache: 'no-store' });
            if (res.ok) {
                const settings = await res.json();
                requireActivation = settings.REQUIRE_ACTIVATION;
            }
        } catch (e) {
            // Silently fail open or closed based on default preference (false is safer for prod)
        }

        // --- ACTIVATION GATE ---
        if (requireActivation) {
            if (payload.isActivated === false && payload.isEarlyAccess !== true && payload.activationSource !== 'admin' && payload.activationSource !== 'beta') {
                if (!pathname.startsWith('/activate')) {
                    return NextResponse.redirect(new URL('/activate', request.url));
                }
            } else if (pathname.startsWith('/activate')) {
                // Prevent activated users from accessing the activation page
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
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
    matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/register', '/uploads/:path*', '/create', '/history', '/settings', '/activate', '/feedback'],
};

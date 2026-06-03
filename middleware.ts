import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin') ?? '';
    const isTrustedOrigin =
        origin.startsWith('capacitor://') ||
        origin === 'https://verihub.app';

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        if (isTrustedOrigin) {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            });
        }
        return new NextResponse(null, { status: 200 }); // untrusted OPTIONS silent fail
    }

    // Handle regular requests
    const response = NextResponse.next();
    if (isTrustedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
}

export const config = {
    matcher: '/api/:path*',
};

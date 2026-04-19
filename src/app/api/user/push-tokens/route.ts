import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Handle POST request to register a new Native Push token for a user.
 * Payload should contain: { token: string, platform: 'android' | 'ios' | 'web' }
 */
export async function POST(request: Request) {
    try {
        const authToken = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(authToken);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { 
            if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); 
            throw e; 
        }

        const body = await request.json();
        const { token, platform } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is explicitly required' }, { status: 400 });
        }

        // Upsert the token to ensure the current user exclusively owns it (even if it drifted from another dev session)
        const pushToken = await db.pushToken.upsert({
            where: { token },
            create: {
                token,
                platform: platform || 'unknown',
                userId: user.userId
            },
            update: {
                userId: user.userId, // Reassign if a new user logged into the same physical hardware wrapper
                platform: platform || 'unknown',
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, pushToken });
    } catch (error) {
        console.error('Failed to register hardware push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

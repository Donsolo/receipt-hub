import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const session = await verifyToken(token);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(session); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: {
                notifyConnectionRequests: true,
                notifyConnectionAccepted: true,
                notifyMessages: true,
                notifySystem: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const session = await verifyToken(token);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(session); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();

        // Strict mapping to avoid injecting extraneous data
        const updateData: {
            notifyConnectionRequests?: boolean;
            notifyConnectionAccepted?: boolean;
            notifyMessages?: boolean;
            notifySystem?: boolean;
        } = {};

        if (typeof body.notifyConnectionRequests === 'boolean') updateData.notifyConnectionRequests = body.notifyConnectionRequests;
        if (typeof body.notifyConnectionAccepted === 'boolean') updateData.notifyConnectionAccepted = body.notifyConnectionAccepted;
        if (typeof body.notifyMessages === 'boolean') updateData.notifyMessages = body.notifyMessages;
        if (typeof body.notifySystem === 'boolean') updateData.notifySystem = body.notifySystem;

        // If no valid keys mapped, drop safely
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid preferences to update provided.' }, { status: 400 });
        }

        const updatedUser = await db.user.update({
            where: { id: session.userId },
            data: updateData,
            select: {
                notifyConnectionRequests: true,
                notifyConnectionAccepted: true,
                notifyMessages: true,
                notifySystem: true
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Failed to update notification preferences:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { token, platform } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        await prisma.pushToken.upsert({
            where: { token },
            update: { platform: platform || 'unknown', updatedAt: new Date() },
            create: { token, platform: platform || 'unknown', userId: user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to register push token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

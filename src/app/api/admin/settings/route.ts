import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getSystemSettings, clearSettingsCache } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized Admin Access' }, { status: 403 });
        }

        const settings = await getSystemSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to get admin settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized Admin Access' }, { status: 403 });
        }

        const body = await request.json();

        if (body.REQUIRE_ACTIVATION !== undefined) {
            await (db as any).systemSetting.upsert({
                where: { key: 'REQUIRE_ACTIVATION' },
                update: { value: String(body.REQUIRE_ACTIVATION) },
                create: { key: 'REQUIRE_ACTIVATION', value: String(body.REQUIRE_ACTIVATION) }
            });
        }

        if (body.EARLY_ACCESS_OPEN !== undefined) {
            await (db as any).systemSetting.upsert({
                where: { key: 'EARLY_ACCESS_OPEN' },
                update: { value: String(body.EARLY_ACCESS_OPEN) },
                create: { key: 'EARLY_ACCESS_OPEN', value: String(body.EARLY_ACCESS_OPEN) }
            });
        }

        // Clear cache so all servers read fresh DB state
        await clearSettingsCache();

        const updatedSettings = await getSystemSettings();
        return NextResponse.json(updatedSettings);

    } catch (error) {
        console.error('Failed to update admin settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

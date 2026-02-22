import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const settings = await getSystemSettings();
        return NextResponse.json(settings);
    } catch (error) {
        // Safe fallback if DB fails
        return NextResponse.json({
            REQUIRE_ACTIVATION: false,
            EARLY_ACCESS_OPEN: true,
        });
    }
}

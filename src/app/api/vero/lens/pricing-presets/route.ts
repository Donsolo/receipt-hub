import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { TRADE_PRESETS } from '@/lib/vero-ai/tradePresets';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const presets = await db.veroLensPricingPreset.findMany({
            where: { userId: user.id }
        });
        return NextResponse.json(presets);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const body = await request.json();
        const { tradeMode, label, defaultLaborRate, materialMarkupPct, minimumJobFee, travelFee, defaultUnit, notes, isDefault } = body;

        if (!tradeMode || !TRADE_PRESETS[tradeMode]) {
            return new NextResponse('Invalid or missing tradeMode', { status: 400 });
        }

        const preset = await db.veroLensPricingPreset.upsert({
            where: {
                userId_tradeMode: { userId: user.id, tradeMode }
            },
            update: {
                label, defaultLaborRate, materialMarkupPct, minimumJobFee, travelFee, defaultUnit, notes, isDefault
            },
            create: {
                userId: user.id,
                tradeMode,
                label, defaultLaborRate, materialMarkupPct, minimumJobFee, travelFee, defaultUnit, notes, isDefault
            }
        });

        return NextResponse.json(preset);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

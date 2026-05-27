import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const body = await request.json();

        // Safety check, avoid updating tradeMode or userId here usually
        const { label, defaultLaborRate, materialMarkupPct, minimumJobFee, travelFee, defaultUnit, notes, isDefault } = body;

        const preset = await db.veroLensPricingPreset.update({
            where: { id, userId: user.id },
            data: { label, defaultLaborRate, materialMarkupPct, minimumJobFee, travelFee, defaultUnit, notes, isDefault }
        });
        return NextResponse.json(preset);
    } catch (error) {
        console.error('[PRICING_PRESET_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        await db.veroLensPricingPreset.delete({
            where: { id, userId: user.id }
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

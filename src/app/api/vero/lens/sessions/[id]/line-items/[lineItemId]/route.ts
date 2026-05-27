import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: Request, context: any) {
    const { id, lineItemId } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const body = await request.json();
        const { title, description, quantity, unit, estimatedPriceLow, estimatedPriceHigh } = body;

        const updated = await db.veroLensLineItem.update({
            where: { id: lineItemId, sessionId: id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(quantity !== undefined && { quantity }),
                ...(unit !== undefined && { unit }),
                ...(estimatedPriceLow !== undefined && { estimatedPriceLow }),
                ...(estimatedPriceHigh !== undefined && { estimatedPriceHigh }),
                source: 'USER'
            }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'LINE_ITEM_EDITED',
                message: 'A line item was edited.'
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('[VERO_LENS_LINE_ITEM_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(request: Request, context: any) {
    const { id, lineItemId } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        await db.veroLensLineItem.delete({
            where: { id: lineItemId, sessionId: id }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'LINE_ITEM_DELETED',
                message: 'A line item was deleted.'
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[VERO_LENS_LINE_ITEM_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

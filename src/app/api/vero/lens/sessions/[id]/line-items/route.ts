import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);

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
        
        const lastLineItem = await db.veroLensLineItem.findFirst({
            where: { sessionId: id },
            orderBy: { sortOrder: 'desc' }
        });
        const sortOrder = lastLineItem ? lastLineItem.sortOrder + 1 : 0;

        const lineItem = await db.veroLensLineItem.create({
            data: {
                sessionId: id,
                title: body.title || 'New Item',
                description: body.description,
                quantity: body.quantity || 1,
                unit: body.unit,
                estimatedPriceLow: body.estimatedPriceLow,
                estimatedPriceHigh: body.estimatedPriceHigh,
                source: 'MANUAL',
                sortOrder
            }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'LINE_ITEM_ADDED',
                message: 'A line item was manually added.'
            }
        });

        return NextResponse.json(lineItem);
    } catch (error) {
        console.error('[VERO_LENS_LINE_ITEMS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

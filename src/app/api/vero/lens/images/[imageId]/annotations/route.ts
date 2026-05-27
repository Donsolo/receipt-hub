import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, context: any) {
    const { imageId } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const image = await db.veroLensImage.findFirst({
            where: { id: imageId, userId: user.id }
        });

        if (!image) return new NextResponse('Not Found', { status: 404 });

        return NextResponse.json(image.annotations || []);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(request: Request, context: any) {
    const { imageId } = await Promise.resolve(context.params);
    try {
        const user = await getCurrentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const body = await request.json();
        const annotations = body.annotations;

        if (!Array.isArray(annotations)) {
            return new NextResponse('Invalid payload', { status: 400 });
        }

        // Validate payload size (50kb limit)
        if (JSON.stringify(annotations).length > 50000) {
            return new NextResponse('Payload too large', { status: 413 });
        }

        // Basic validation and sanitization
        const sanitized = annotations.filter(a => 
            ['circle', 'rectangle', 'arrow', 'label'].includes(a.type) &&
            typeof a.x === 'number' && a.x >= 0 && a.x <= 1 &&
            typeof a.y === 'number' && a.y >= 0 && a.y <= 1 &&
            typeof a.width === 'number' &&
            typeof a.height === 'number'
        ).map(a => ({
            id: String(a.id),
            type: a.type,
            x: a.x,
            y: a.y,
            width: a.width,
            height: a.height,
            color: String(a.color).substring(0, 20),
            label: a.label ? String(a.label).substring(0, 100) : undefined,
            note: a.note ? String(a.note).substring(0, 200) : undefined,
            createdAt: a.createdAt
        }));

        const image = await db.veroLensImage.updateMany({
            where: { id: imageId, userId: user.id },
            data: { annotations: sanitized as any }
        });

        if (image.count === 0) return new NextResponse('Not Found', { status: 404 });

        // Emit generic update event
        const imgRecord = await db.veroLensImage.findFirst({
            where: { id: imageId, userId: user.id },
            select: { sessionId: true }
        });

        if (imgRecord) {
            await db.veroLensEvent.create({
                data: {
                    sessionId: imgRecord.sessionId,
                    type: 'ANNOTATION_UPDATED',
                    message: 'Image annotations were updated.'
                }
            });
        }

        return NextResponse.json({ success: true, annotations: sanitized });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

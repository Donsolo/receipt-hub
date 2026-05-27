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

        // Ensure session exists and belongs to user
        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const body = await request.json();
        const { imageUrl, fileSize, fileName, mimeType } = body;

        if (!imageUrl) {
            return new NextResponse('Image URL is required', { status: 400 });
        }

        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (fileSize && fileSize > MAX_SIZE) {
            return new NextResponse('File size exceeds 10MB limit', { status: 400 });
        }

        if (mimeType && !mimeType.startsWith('image/')) {
            return new NextResponse('Only image files are allowed', { status: 400 });
        }

        const image = await db.veroLensImage.create({
            data: {
                sessionId: id,
                userId: user.id,
                imageUrl,
                sizeBytes: fileSize,
                fileName,
                mimeType
            }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'IMAGE_UPLOADED',
                message: 'Image uploaded successfully'
            }
        });

        return NextResponse.json(image);
    } catch (error) {
        console.error('[VERO_LENS_IMAGE_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

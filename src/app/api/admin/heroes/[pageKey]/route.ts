import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

export async function PUT(request: Request, context: { params: Promise<{ pageKey: string }> }) {
    try {
        const params = await context.params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || !(await isAdmin(user.userId))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageUrl, overlayOpacity, blurStrength, title, subtitle } = body;

        const updatedHero = await (db as any).heroImage.upsert({
            where: { pageKey: params.pageKey },
            update: {
                ...(imageUrl && { imageUrl }),
                ...(overlayOpacity !== undefined && { overlayOpacity: parseFloat(overlayOpacity) }),
                ...(blurStrength !== undefined && { blurStrength: parseFloat(blurStrength) }),
                ...(title !== undefined && { title }),
                ...(subtitle !== undefined && { subtitle }),
            },
            create: {
                pageKey: params.pageKey,
                imageUrl: imageUrl || '', // Image URL needs to be required natively or supplied here
                overlayOpacity: overlayOpacity !== undefined ? parseFloat(overlayOpacity) : 0.55,
                blurStrength: blurStrength !== undefined ? parseFloat(blurStrength) : 6,
                title: title || '',
                subtitle: subtitle || '',
            }
        });

        return NextResponse.json(updatedHero);
    } catch (error) {
        console.error('Error updating hero config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

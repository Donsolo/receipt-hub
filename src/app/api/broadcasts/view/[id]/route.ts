import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Increment view count
        await db.broadcastMessage.update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error tracking broadcast view:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

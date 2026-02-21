import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageUrl, items } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        const receipt = await db.receipt.create({
            data: {
                userId: user.userId,
                imageUrl,
                date: new Date(),
            },
        });

        // Create nested items
        if (items && Array.isArray(items) && items.length > 0) {
            await (db as any).receiptItem.createMany({
                data: items.map((item: any) => ({
                    receiptId: receipt.id,
                    description: item.description,
                    amount: item.amount,
                })),
            });

            // PHASE 4 AUTO-POPULATE: Save/Update frequently used items
            for (const item of items) {
                if (item.description && typeof item.description === 'string') {
                    const originalName = item.description.trim();
                    if (originalName) {
                        const normalizedName = originalName.toLowerCase();

                        await (db as any).savedReceiptItem.upsert({
                            where: {
                                userId_normalizedName: {
                                    userId: user.userId,
                                    normalizedName
                                }
                            },
                            update: {
                                usageCount: { increment: 1 }
                            },
                            create: {
                                userId: user.userId,
                                name: originalName,
                                normalizedName,
                                usageCount: 1
                            }
                        });
                    }
                }
            }
        }

        return NextResponse.json(receipt);
    } catch (error) {
        console.error('Create Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const receipts = await db.receipt.findMany({
            where: {
                userId: user.userId,
                receiptNumber: { not: null },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(receipts);
    } catch (error) {
        console.error('Fetch Receipts Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

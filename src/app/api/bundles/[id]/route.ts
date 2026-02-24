import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        // Security check: Must own bundle
        const existingBundle = await (db as any).bundle.findUnique({ where: { id } });
        if (!existingBundle || existingBundle.userId !== user.userId) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;

        const bundle = await (db as any).bundle.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(bundle);
    } catch (error) {
        console.error('Failed to update bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Security check: Must own bundle
        const existingBundle = await (db as any).bundle.findUnique({ where: { id } });
        if (!existingBundle || existingBundle.userId !== user.userId) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
        }

        await (db as any).bundle.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const bundle = await (db as any).bundle.findUnique({
            where: { id },
            include: {
                receipts: {
                    include: {
                        receipt: {
                            include: {
                                category: true
                            }
                        }
                    },
                    orderBy: {
                        addedAt: 'desc'
                    }
                }
            }
        });

        if (!bundle || bundle.userId !== user.userId) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
        }

        return NextResponse.json(bundle);
    } catch (error) {
        console.error('Failed to fetch bundle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

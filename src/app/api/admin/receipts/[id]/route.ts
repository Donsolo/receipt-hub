import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { deleteS3Object } from '@/lib/s3';

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const authUser = await verifyToken(token || '');

        if (!authUser || authUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const receiptId = params.id;

        // 1. Get receipt
        const receipt = await db.receipt.findUnique({
            where: { id: receiptId },
        });

        if (!receipt) {
            return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
        }

        // 2. Delete from S3
        if (receipt.imageUrl) {
            await deleteS3Object(receipt.imageUrl);
        }

        // 3. Delete from DB
        await db.receipt.delete({
            where: { id: receiptId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

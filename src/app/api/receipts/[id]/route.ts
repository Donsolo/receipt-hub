import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch receipt first to check for S3 image
        const receipt = await db.receipt.findUnique({
            where: {
                id: params.id,
                userId: user.userId,
            }
        });

        if (!receipt) {
            return NextResponse.json({ error: 'Receipt not found or unauthorized' }, { status: 404 });
        }

        // If uploaded receipt, delete from S3
        if (receipt.imageUrl) {
            try {
                const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
                const s3 = new S3Client({
                    region: process.env.AWS_REGION,
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                    },
                });

                // Extract key from URL
                const url = new URL(receipt.imageUrl);
                const key = url.pathname.substring(1); // Remove leading slash

                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key,
                }));
            } catch (err) {
                console.error("Failed to delete S3 object:", err);
                // Continue to delete DB record even if S3 fails
            }
        }

        const result = await db.receipt.delete({
            where: {
                id: params.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, clientName, notes, total, taxValue } = body;

        // Verify ownership
        const existingReceipt = await db.receipt.findUnique({
            where: {
                id: params.id,
                userId: user.userId,
            }
        });

        if (!existingReceipt) {
            return NextResponse.json({ error: 'Receipt not found or unauthorized' }, { status: 404 });
        }

        const updatedReceipt = await db.receipt.update({
            where: { id: params.id },
            data: {
                date: date ? new Date(date) : undefined,
                clientName: clientName !== undefined ? clientName : undefined,
                notes: notes !== undefined ? notes : undefined,
                total: total !== undefined ? parseFloat(total) : undefined,
                taxValue: taxValue !== undefined ? parseFloat(taxValue) : undefined,
            },
        });

        return NextResponse.json(updatedReceipt);
    } catch (error) {
        console.error('Update Receipt Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

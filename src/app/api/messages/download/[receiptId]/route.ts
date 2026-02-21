import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ receiptId: string }> }
) {
    try {
        const { receiptId } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Fetch the Receipt and its Message linkages
        const receipt = await (db as any).receipt.findUnique({
            where: { id: receiptId },
            include: {
                messages: {
                    include: {
                        message: true
                    }
                }
            }
        });

        if (!receipt) {
            return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
        }

        // 2. Security Check: Is the user the owner, or part of a message thread containing it?
        const isOwner = receipt.userId === user.userId;

        const isP2PParticipant = receipt.messages.some((pivot: any) =>
            pivot.message.senderId === user.userId || pivot.message.receiverId === user.userId
        );

        if (!isOwner && !isP2PParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!receipt.imageUrl) {
            return NextResponse.json({ error: 'No file attached to this receipt record' }, { status: 404 });
        }

        // 3. Securely fetch the file server-side to obscure the raw S3 URL
        const fileResponse = await fetch(receipt.imageUrl);

        if (!fileResponse.ok) {
            return NextResponse.json({ error: 'Failed to retrieve file from storage' }, { status: 502 });
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Derive filename and content type
        const urlObj = new URL(receipt.imageUrl);
        const filename = urlObj.pathname.split('/').pop() || `receipt-${receiptId}.pdf`;

        // Basic inference; could be improved with mime-types or storing contentType in DB
        const isPdf = filename.toLowerCase().endsWith('.pdf');
        const contentType = isPdf ? 'application/pdf' : 'image/jpeg';

        // 4. Return as proxy stream
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error('Download Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

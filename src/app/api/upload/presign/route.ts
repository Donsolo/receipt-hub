import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyToken } from '@/lib/auth';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(request: Request) {
    try {
        // 1. Authenticate
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Generate Key
        const timestamp = Date.now();
        const key = `receipts/${user.userId}/${timestamp}.jpg`;
        const bucket = process.env.S3_BUCKET_NAME;

        if (!bucket) {
            return NextResponse.json({ error: 'Server misconfiguration: No bucket' }, { status: 500 });
        }

        // 3. Create Command
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: 'image/jpeg', // Enforcing JPEG for simplicity as per request context implies standard image
        });

        // 4. Generate Signed URL
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return NextResponse.json({ uploadUrl, fileUrl });

    } catch (error) {
        console.error('Presign Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

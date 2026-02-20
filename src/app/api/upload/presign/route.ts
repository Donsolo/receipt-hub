import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// IAM user must have:
// s3:PutObject
// s3:GetObject
// s3:ListBucket

export async function POST(request: Request) {
    try {
        const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME } = process.env;

        if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
            console.error("Missing AWS env variable");
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
        }

        const s3Client = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
        });

        const body = await request.json().catch(() => ({}));
        const { filename, fileType } = body;

        if (!fileType || !filename) {
            return NextResponse.json({ error: "Missing fileType or filename" }, { status: 400 });
        }

        // 1. Authenticate
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Generate Key
        const timestamp = Date.now();
        const generatedKey = `receipts/${user.userId}/${timestamp}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

        // 3. Create Command
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: generatedKey,
            ContentType: fileType,
        });

        // 4. Generate Signed URL
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        const fileUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${generatedKey}`;

        return NextResponse.json({ uploadUrl, fileUrl });

    } catch (error) {
        console.error("PRESIGN_ERROR:", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}

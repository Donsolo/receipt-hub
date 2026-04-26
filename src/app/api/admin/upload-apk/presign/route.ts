import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

        if (fileType !== 'application/vnd.android.package-archive' && !filename.endsWith('.apk')) {
             return NextResponse.json({ error: "Only APK files are permitted via this endpoint" }, { status: 400 });
        }

        // 1. Authenticate Admin
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const user = await verifyToken(token || '');

        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized Admin Access' }, { status: 403 });
        }

        // 2. Generate Key - Public facing application release path
        const timestamp = Date.now();
        const generatedKey = `app-releases/verihub-beta-${timestamp}.apk`;

        // 3. Create Command
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: generatedKey,
            ContentType: fileType,
        });

        // 4. Generate Signed URL
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 120 }); // Give them 2 minutes to upload massive files
        const fileUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${generatedKey}`;

        return NextResponse.json({ uploadUrl, fileUrl });

    } catch (error) {
        console.error("PRESIGN_ERROR:", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}

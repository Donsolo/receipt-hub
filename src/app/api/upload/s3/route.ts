import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { cookies } from 'next/headers';

// IAM user must have:
// s3:PutObject

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

        const formData = await request.formData().catch(() => null);
        if (!formData) {
            return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
        }

        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const fileType = file.type || "image/jpeg";
        const filename = file.name || "mobile_capture.jpg";

        // 1. Authenticate user
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const user = await verifyToken(token || '');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try { await ensureActivated(user); } 
        catch (e: any) { 
            if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); 
            throw e; 
        }

        // 2. Prepare Buffer payload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 3. Generate AWS S3 isolated Key
        const timestamp = Date.now();
        const generatedKey = `receipts/${user.userId}/${timestamp}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

        // 4. Force execute the direct S3 Backend Proxy Request avoiding browser CORS hooks entirely
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: generatedKey,
            Body: buffer,
            ContentType: fileType,
            // ACL: 'public-read' (Optional: If the bucket block-public-access settings allow it, otherwise keep it private and serve it via pre-signed GETs, though this project serves them publicly since the URLs map straight to img src attributes).
        });

        await s3Client.send(command);
        
        // 5. Securely return structural path
        const fileUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${generatedKey}`;

        return NextResponse.json({ fileUrl, fileSize: buffer.length });

    } catch (error) {
        console.error("SERVER_S3_UPLOAD_PROXY_ERROR:", error);
        return NextResponse.json({ error: "Failed to upload file to S3 proxy layer" }, { status: 500 });
    }
}

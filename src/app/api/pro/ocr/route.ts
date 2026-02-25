import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { requirePro } from '@/lib/requirePro';
import { processReceiptOCR } from '@/lib/ocrService';

export const dynamic = 'force-dynamic';
// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
    try {
        // 1. Authenticate Request
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Enforce PRO Tier
        try {
            requirePro(user);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        // 3. Process File Upload
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 413 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 415 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // 4. Perform OCR
        const ocrResult = await processReceiptOCR(buffer, file.type);

        // 5. Return success envelope
        return NextResponse.json({
            normalized: ocrResult,
            requiresReview: true
        }, { status: 200 });

    } catch (error: any) {
        if (error.message === "OCR_NOT_CONFIGURED") {
            return NextResponse.json(
                { error: 'OCR Service is currently unavailable. Please contact support.' },
                { status: 503 }
            );
        }

        console.error('OCR Processing Error:', error);
        return NextResponse.json(
            { error: 'Failed to process image' },
            { status: 500 }
        );
    }
}

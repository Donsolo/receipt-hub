import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { requirePro } from '@/lib/requirePro';
import { processReceiptOCR } from '@/lib/ocrService'; // Fallback logic

export const dynamic = 'force-dynamic';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        try {
            requirePro(user);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 413 });
        if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 415 });

        // Forwarding to external AI Worker (e.g. Railway)
        const useExternalOCR = process.env.ENABLE_EXTERNAL_OCR === 'true';
        const aiWorkerUrl = process.env.AI_WORKER_URL;

        if (useExternalOCR && aiWorkerUrl) {
            try {
                // We send the exact same formData (multipart/form-data)
                // Reconstruct to ensure a clean request
                const workerFormData = new FormData();
                workerFormData.append('file', file);

                const response = await fetch(aiWorkerUrl, {
                    method: 'POST',
                    body: workerFormData
                });

                if (response.ok) {
                    const data = await response.json();

                    // Enforce the requested Railway response schema and seamlessly map it back to 
                    // the `NormalizedOCRData` schema expected by the React frontend components.
                    return NextResponse.json({
                        normalized: {
                            merchantName: data.merchantName ?? null,
                            transactionDate: data.transactionDate ?? null,
                            subtotal: data.subtotal ?? null,
                            tax: data.tax ?? null,
                            total: data.total ?? null,
                            paymentMethod: data.paymentMethod ?? null,
                            // Convert Railway `Array<{ name: string; price: number | null }>` back to `description`, `price`
                            lineItems: Array.isArray(data.lineItems) ? data.lineItems.map((item: any) => ({
                                description: item.name || item.description || "Item",
                                quantity: 1,
                                price: item.price !== undefined ? item.price : null,
                                total: item.price !== undefined ? item.price : null
                            })) : [],
                            confidenceScore: data.confidenceScore ?? 0,
                            confidence: data.confidenceScore ?? 0, // Fallback normalization for ReceiptForm
                            source: data.source || "railway-ocr"
                        },
                        requiresReview: true
                    }, { status: 200 });
                } else {
                    console.error("External worker returned an error:", response.status);
                }
            } catch (err) {
                console.error("Failed to reach external AI worker. Falling back to OpenAI:", err);
            }
        }

        // Fallback or disabled: Run original serverless OCR vision logic
        const buffer = Buffer.from(await file.arrayBuffer());
        const ocrResult = await processReceiptOCR(buffer, file.type);

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

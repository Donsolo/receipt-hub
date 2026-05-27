import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeLensImage } from '@/lib/vero-ai/analyzeLensImage';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

async function getS3Buffer(fileUrl: string): Promise<Buffer> {
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); 

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
        throw new Error("S3 object body is empty");
    }
    const chunks = [];
    for await (const chunk of response.Body as any) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function POST(request: Request, context: any) {
    const { id } = await Promise.resolve(context.params);

    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { tradeMode = 'general', usePricingPreset = false } = body;

        const session = await db.veroLensSession.findUnique({
            where: { id, userId: user.id },
            include: { images: true }
        });

        if (!session) {
            return new NextResponse('Not Found', { status: 404 });
        }

        if (session.images.length === 0) {
            return new NextResponse('No images attached to session', { status: 400 });
        }

        const latestImage = session.images[session.images.length - 1];
        
        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'AI_ANALYSIS_STARTED',
                message: 'Started Vero AI analysis on image.'
            }
        });

        await db.veroLensSession.update({
            where: { id },
            data: { status: 'ANALYZING' }
        });

        // 1. Fetch image buffer from S3
        let fileBuffer: Buffer;
        try {
            fileBuffer = await getS3Buffer(latestImage.imageUrl);
        } catch (err: any) {
            console.error("Failed to fetch image from S3:", err);
            await db.veroLensSession.update({
                where: { id },
                data: { status: 'FAILED' }
            });
            return new NextResponse('Failed to fetch image for analysis', { status: 500 });
        }

        let userPricingPreset = undefined;
        let customContextDetails = null;

        const effectiveTradeMode = session.tradeMode || tradeMode;

        if (effectiveTradeMode.startsWith('custom_')) {
            const customId = effectiveTradeMode.replace('custom_', '');
            const customContext = await db.veroLensCustomContext.findUnique({ where: { id: customId } });
            if (customContext) {
                customContextDetails = customContext;
            }
        }

        if (usePricingPreset) {
            const preset = await db.veroLensPricingPreset.findUnique({
                where: { userId_tradeMode: { userId: user.id, tradeMode: effectiveTradeMode } }
            });
            if (preset) {
                userPricingPreset = preset;
            }
        }

        // 2. Pass to AI abstraction
        const result = await analyzeLensImage(
            fileBuffer, 
            latestImage.mimeType || 'image/jpeg', 
            effectiveTradeMode,
            userPricingPreset,
            Array.isArray(latestImage.annotations) ? latestImage.annotations : undefined,
            customContextDetails?.name,
            customContextDetails?.description || undefined
        );

        // 3. Clear existing detections/line items/questions to support safe re-analysis
        await db.$transaction([
            db.veroLensDetection.deleteMany({ where: { sessionId: id } }),
            db.veroLensLineItem.deleteMany({ where: { sessionId: id, source: 'AI' } }),
            db.veroLensQuestion.deleteMany({ where: { sessionId: id } })
        ]);

        // 4. Save results to DB
        await db.veroLensDetection.createMany({
            data: result.detectedItems.map(d => ({
                sessionId: id,
                name: d.name,
                quantity: d.quantity,
                condition: d.condition,
                confidence: d.confidence,
                notes: d.notes
            }))
        });

        await db.veroLensLineItem.createMany({
            data: result.suggestedLineItems.map((li, index) => ({
                sessionId: id,
                title: li.title,
                description: li.description,
                quantity: li.quantity || 1,
                unit: li.unit,
                estimatedPriceLow: li.estimatedPriceLow,
                estimatedPriceHigh: li.estimatedPriceHigh,
                confidence: li.confidence,
                source: 'AI',
                sortOrder: index
            }))
        });

        await db.veroLensQuestion.createMany({
            data: result.questions.map(q => ({
                sessionId: id,
                question: q.question,
                required: q.required || false
            }))
        });

        const updatedSession = await db.veroLensSession.update({
            where: { id },
            data: {
                status: 'NEEDS_REVIEW',
                serviceCategory: result.serviceCategory,
                tradeModeLabel: customContextDetails?.name || null,
                aiSummary: result.summary,
                disclaimer: result.disclaimer,
                confidenceScore: result.confidenceScore,
                aiModel: result.aiModel,
                aiProvider: result.aiProvider,
                analysisVersion: result.analysisVersion,
                aiRawJson: JSON.parse(JSON.stringify(result)) // Store raw result for debugging/analytics
            }
        });

        await db.veroLensEvent.create({
            data: {
                sessionId: id,
                type: 'AI_ANALYSIS_COMPLETED',
                message: 'Vero AI analysis completed successfully.'
            }
        });

        return NextResponse.json(updatedSession);
    } catch (error) {
        console.error('[VERO_LENS_ANALYZE_POST]', error);
        
        // Log failure event
        try {
            await db.veroLensEvent.create({
                data: {
                    sessionId: id,
                    type: 'AI_ANALYSIS_FAILED',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            await db.veroLensSession.update({
                where: { id },
                data: { status: 'FAILED' }
            });
        } catch(e) {}
        
        return new NextResponse('Internal Error', { status: 500 });
    }
}

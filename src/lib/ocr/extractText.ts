import { createWorker } from 'tesseract.js';

export interface OcrExtractionResult {
    rawText: string;
    confidence: number;
    // Bounding boxes could be added here if needed for advanced heuristics:
    // lines: Array<{ text: string, bbox: any }>;
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<OcrExtractionResult> {
    const worker = await createWorker('eng');

    try {
        const { data } = await worker.recognize(imageBuffer);

        return {
            rawText: data.text,
            confidence: data.confidence / 100 // normalize to 0-1
        };
    } finally {
        await worker.terminate();
    }
}

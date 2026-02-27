import { extractTextFromImage } from '@/lib/ocr/extractText';
import { parseReceiptWithOllama } from '@/lib/ai/parseReceipt';
import { NormalizedOCRData } from '@/lib/ocrService';

export async function processLocalReceipt(fileBuffer: Buffer, mimeType: string): Promise<NormalizedOCRData> {
    console.log("[Local OCR Orchestrator] Starting Tesseract image processing...");

    // 1. Run visual character extraction locally
    const ocrResult = await extractTextFromImage(fileBuffer);

    if (!ocrResult.rawText || ocrResult.rawText.trim() === '') {
        throw new Error("No readable text found on the receipt image via local OCR.");
    }

    console.log(`[Local OCR Orchestrator] Extracted ${ocrResult.rawText.length} characters (Confidence: ${ocrResult.confidence.toFixed(2)}). Handing off to local LLM for semantic mapping...`);

    // 2. Parse the unstructured text with the local LLM
    const parsedData = await parseReceiptWithOllama(ocrResult.rawText);

    // 3. Compute a mixed heuristic baseline confidence
    // We average the visual OCR confidence with the LLM's structural assessment
    const finalConfidence = ((ocrResult.confidence) + (parsedData.confidence || 0.8)) / 2;

    // 4. Bind the final output
    return {
        ...parsedData,
        confidence: finalConfidence,
        raw: {
            ...parsedData.raw,
            tesseract_raw_text: ocrResult.rawText
        }
    };
}

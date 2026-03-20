import sharp from 'sharp';
import { enhanceWithHeuristics } from './structuredParser';

export interface NormalizedOCRData {
    merchantName: string | null;
    merchantAddress?: string | null;
    phone?: string | null;
    transactionDate: string | null;
    subtotal: number | null;
    tax: number | null;
    total: number | null;
    currency?: string | null;
    paymentMethod?: string | null;
    last4?: string | null;
    lineItems: {
        description: string;
        quantity?: number;
        price?: number;
        total?: number;
    }[];
    confidence?: number;
    needsReview?: boolean;
    rawText?: string;
    raw?: any;
}

export async function processReceiptOCR(fileBuffer: Buffer, mimeType: string): Promise<NormalizedOCRData> {
    const provider = process.env.OCR_PROVIDER;

    if (!provider) {
        throw new Error("OCR_NOT_CONFIGURED");
    }

    switch (provider.toUpperCase()) {
        case "OPENAI":
            return await processWithOpenAI(fileBuffer, mimeType);
        case "AZURE":
            // Placeholder for Azure DI
            return await processWithPlaceholder("Azure");
        case "GOOGLE":
            // Placeholder for Google Document AI
            return await processWithPlaceholder("Google");
        default:
            throw new Error(`UNSUPPORTED_OCR_PROVIDER: ${provider}`);
    }
}

// ---------------------------------------------------------------------------
// Provider Implementations
// ---------------------------------------------------------------------------

// Helper to call OpenAI API
async function callOpenAIOCR(fileBuffer: Buffer, mimeType: string, temperature: number = 0.1): Promise<any> {
    const apiKey = process.env.OCR_API_KEY;
    if (!apiKey) throw new Error("OCR_API_KEY missing for OpenAI provider");

    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `You are an expert receipt parsing assistant. Extract the information from the provided receipt image.
Return ONLY a valid JSON object matching this exact structure (use null for fields you cannot confidently extract):
{
  "merchantName": "string or null",
  "merchantAddress": "string or null",
  "phone": "string or null",
  "transactionDate": "YYYY-MM-DD or null",
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "currency": "string or null (e.g. USD, EUR)",
  "paymentMethod": "string or null (e.g. VISA, CASH)",
  "last4": "string or null (last 4 digits of card)",
  "lineItems": [
    {
      "description": "string",
      "quantity": number or 1,
      "price": number or null (unit price),
      "total": number or null (line total)
    }
  ],
  "confidence": number between 0 and 1,
  "rawText": "string containing ALL verbatim text found on the receipt exactly as written, with line breaks preserved as \\n"
}

Do not include markdown formatting like \`\`\`json in your response. Just output raw JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 2500,
            temperature: temperature
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || "{}";
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanContent);
}

// Multi-pass implementation
async function processWithOpenAI(fileBuffer: Buffer, mimeType: string): Promise<NormalizedOCRData> {
    try {
        console.log("[OCR Service] Pass 1: Original Image");
        let parsed = await callOpenAIOCR(fileBuffer, mimeType, 0.1);
        let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
        
        // Validation check for Pass 1
        const isMissingCritical = !parsed.merchantName || !parsed.total;
        
        if (confidence < 0.75 || isMissingCritical) {
            console.log(`[OCR Service] Pass 1 yielded weak results (Conf: ${confidence}, Missing Critical: ${isMissingCritical}). Initiating Pass 2...`);
            
            // Apply preprocessing: Grayscale, Normalize (adaptive contrast), and resize limit
            const preprocessedBuffer = await sharp(fileBuffer)
                .grayscale()
                .normalize()
                .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
                .toFormat('jpeg', { quality: 90 }) // standardize back to jpeg
                .toBuffer();
            
            parsed = await callOpenAIOCR(preprocessedBuffer, 'image/jpeg', 0.2);
            confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
            console.log(`[OCR Service] Pass 2 Completed (Conf: ${confidence})`);
        }

        // Pass to specialized Heuristics layer to extract values missed by AI JSON structure
        const finalData = enhanceWithHeuristics(parsed.rawText || "", parsed);
        
        return finalData;
    } catch (error: any) {
        console.error("OpenAI OCR Error:", error);
        throw new Error(`Failed to process OCR via OpenAI: ${error.message}`);
    }
}

async function processWithPlaceholder(providerName: string): Promise<NormalizedOCRData> {
    console.log(`[OCR Service] Processing receipt with placeholder provider: ${providerName}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
        merchantName: `Mock Merchant (${providerName})`,
        transactionDate: new Date().toISOString().split('T')[0],
        subtotal: 39.00,
        tax: 3.50,
        total: 42.50,
        lineItems: [
            { description: "Mock Item 1", quantity: 1, price: 39.00, total: 39.00 }
        ],
        confidence: 0.99
    };
}

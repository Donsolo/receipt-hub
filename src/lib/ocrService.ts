export interface OCRResult {
    merchant: string;
    date: string;
    total: number;
    tax?: number;
}

export async function processReceiptOCR(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
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

async function processWithOpenAI(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    const apiKey = process.env.OCR_API_KEY;
    if (!apiKey) throw new Error("OCR_API_KEY missing for OpenAI provider");

    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `You are a receipt parsing assistant. Extract the following information from the provided receipt image.
Return ONLY a valid JSON object with exact keys:
- merchant (string, the name of the store or entity)
- date (string, in YYYY-MM-DD format if possible, or whatever format is on the receipt)
- total (number, the final total amount paid)
- tax (number, the tax amount if visible, otherwise null or omit)

Do not include markdown formatting like \`\`\`json in your response. Just the raw JSON.`;

    try {
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
                            {
                                type: "image_url",
                                image_url: { url: dataUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 300,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim() || "{}";

        // Sometimes the model still outputs markdown blocks despite instructions
        const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(cleanContent);

        return {
            merchant: parsed.merchant || "Unknown Merchant",
            date: parsed.date || new Date().toISOString().split('T')[0],
            total: typeof parsed.total === 'number' ? parsed.total : 0,
            tax: typeof parsed.tax === 'number' ? parsed.tax : undefined
        };

    } catch (error: any) {
        console.error("OpenAI OCR Error:", error);
        throw new Error(`Failed to process OCR via OpenAI: ${error.message}`);
    }
}

async function processWithPlaceholder(providerName: string): Promise<OCRResult> {
    console.log(`[OCR Service] Processing receipt with placeholder provider: ${providerName}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
        merchant: `Mock Merchant (${providerName})`,
        date: new Date().toISOString().split('T')[0],
        total: 42.50,
        tax: 3.50
    };
}

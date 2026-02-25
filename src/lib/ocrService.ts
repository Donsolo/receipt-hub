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

async function processWithOpenAI(fileBuffer: Buffer, mimeType: string): Promise<NormalizedOCRData> {
    const apiKey = process.env.OCR_API_KEY;
    if (!apiKey) throw new Error("OCR_API_KEY missing for OpenAI provider");

    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `You are an expert receipt parsing assistant. Extract the information from the provided receipt image.
Return ONLY a valid JSON object matching this exact structure structure (use null for fields you cannot confidently extract):
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
  "confidence": number between 0 and 1
}

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
            merchantName: parsed.merchantName || null,
            merchantAddress: parsed.merchantAddress || null,
            phone: parsed.phone || null,
            transactionDate: parsed.transactionDate || null,
            subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
            tax: typeof parsed.tax === 'number' ? parsed.tax : null,
            total: typeof parsed.total === 'number' ? parsed.total : null,
            currency: parsed.currency || null,
            paymentMethod: parsed.paymentMethod || null,
            last4: parsed.last4 || null,
            lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
            raw: parsed
        };

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

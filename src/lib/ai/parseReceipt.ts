import { NormalizedOCRData } from "@/lib/ocrService";

export async function parseReceiptWithOllama(ocrText: string): Promise<NormalizedOCRData> {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const model = process.env.LOCAL_LLM_MODEL || 'llama3';

    const prompt = `You are an expert receipt parser. Analyze the following OCR text extracted from a receipt and structured it into a strict JSON payload.
Return ONLY valid JSON matching this exact structure structure (use null for fields you cannot confidently extract):
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

Do not hallucinate any values. If a value is missing or unreadable, set it to null.
Do not wrap your response in markdown formatting block quotes (e.g. \`\`\`json). Output RAW JSON only.

RAW OCR TEXT:
---
${ocrText}
---
`;

    try {
        const response = await fetch(`${ollamaHost}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: prompt
                    }
                ],
                stream: false,
                format: "json", // Instructs Ollama to strictly enforce JSON output
                options: {
                    temperature: 0.0 // Lowest temperature for maximum factual rigidity
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.message?.content || "{}";

        // Clean any residual markdown just in case
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
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8, // Fallback confidence
            raw: parsed
        };

    } catch (error: any) {
        console.error("Local LLM Parsing Error (Ollama):", error);
        throw new Error(`Failed to parse OCR text via Ollama: ${error.message}`);
    }
}

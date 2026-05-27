export interface VeroLensAnalysisResult {
    summary: string;
    serviceCategory?: string;
    confidenceScore?: number;
    detectedItems: Array<{
        name: string;
        quantity?: number;
        condition?: string;
        confidence?: number;
        notes?: string;
    }>;
    suggestedLineItems: Array<{
        title: string;
        description?: string;
        quantity?: number;
        unit?: string;
        estimatedPriceLow?: number;
        estimatedPriceHigh?: number;
        confidence?: number;
    }>;
    questions: Array<{
        question: string;
        required?: boolean;
    }>;
    pricingAssumptions?: string[];
    disclaimer: string;
    aiModel: string;
    aiProvider: string;
    analysisVersion: string;
}

import { getTradePreset } from './tradePresets';

export async function analyzeLensImage(
    fileBuffer: Buffer,
    mimeType: string,
    tradeMode: string = 'general',
    userPricingPreset?: any,
    annotations?: any[],
    customContextName?: string,
    customContextDescription?: string
): Promise<VeroLensAnalysisResult> {
    const isMock = process.env.VERO_LENS_MOCK_AI === 'true';

    if (isMock) {
        return getMockResult(tradeMode, customContextName);
    }

    const apiKey = process.env.OCR_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("AI API Key missing");
    }

    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const preset = getTradePreset(tradeMode, customContextName, customContextDescription);
    
    let tradeContext = `You are Vero AI helping a business owner draft an estimate from a photo.\n`;
    if (customContextName) {
        tradeContext += `This is a USER-DEFINED CUSTOM BUSINESS CONTEXT: "${customContextName}". Adapt your analysis to fit this specific niche.\n`;
    }
    tradeContext += `Trade Mode: ${preset.label}\n`;
    tradeContext += `Inspection Focus: ${preset.inspectionFocus}\n`;
    tradeContext += `Common Units: ${preset.commonUnits.join(', ')}\n`;
    tradeContext += `Suggested Line Item Structure: ${preset.suggestedStructure}\n`;
    tradeContext += `Measurement Warning: ${preset.measurementWarning}\n`;
    tradeContext += `Pricing Safety Note: ${preset.pricingSafetyNote}\n`;

    if (userPricingPreset) {
        tradeContext += `\nCRITICAL USER PRICING DEFAULTS (Use these as strong guidance):\n`;
        if (userPricingPreset.defaultLaborRate) tradeContext += `- Default Labor Rate: $${userPricingPreset.defaultLaborRate}/hr\n`;
        if (userPricingPreset.materialMarkupPct) tradeContext += `- Material Markup: ${userPricingPreset.materialMarkupPct}%\n`;
        if (userPricingPreset.minimumJobFee) tradeContext += `- Minimum Job Fee: $${userPricingPreset.minimumJobFee}\n`;
        if (userPricingPreset.travelFee) tradeContext += `- Travel Fee: $${userPricingPreset.travelFee}\n`;
        if (userPricingPreset.defaultUnit) tradeContext += `- Preferred Default Unit: ${userPricingPreset.defaultUnit}\n`;
        if (userPricingPreset.notes) tradeContext += `- Special Notes: ${userPricingPreset.notes}\n`;
        tradeContext += `Do not invent random labor rates when the user has provided rates above.\n`;
    }

    if (annotations && annotations.length > 0) {
        tradeContext += `\nUSER ANNOTATIONS (Review Context):\n`;
        tradeContext += `The user marked these regions/notes on the image. Use them as review context, but do not assume they are technically verified.\n`;
        annotations.forEach(ann => {
            if (ann.label || ann.note) {
                tradeContext += `- Marker (${ann.type}): ${ann.label || ''} ${ann.note ? `(${ann.note})` : ''}\n`;
            }
        });
    }

    const prompt = `${tradeContext}

Identify visible objects, materials, damage, work scope, or service opportunity.
Do not pretend to know exact measurements unless scale is visible.
Do not create final pricing certainty. Return price ranges only when reasonable.
Always produce editable draft line items.
Always include follow-up questions when missing info is needed. Ensure you ask the required trade follow-ups: ${preset.followUpQuestions.join(' ')}
Always include confidence values between 0 and 1.
Explicitly state uncertainty in the summary or disclaimer if information is missing.
Explain your pricing assumptions in the 'pricingAssumptions' array.

Return ONLY a valid JSON object matching this exact structure:
{
  "summary": "string (explicitly state uncertainty if info is missing)",
  "serviceCategory": "string or null",
  "confidenceScore": number between 0 and 1,
  "detectedItems": [
    {
      "name": "string",
      "quantity": number or null,
      "condition": "string or null",
      "confidence": number between 0 and 1,
      "notes": "string or null"
    }
  ],
  "suggestedLineItems": [
    {
      "title": "string",
      "description": "string or null",
      "quantity": number or 1,
      "unit": "string or null",
      "estimatedPriceLow": number or null,
      "estimatedPriceHigh": number or null,
      "confidence": number between 0 and 1
    }
  ],
  "questions": [
    {
      "question": "string",
      "required": boolean
    }
  ],
  "pricingAssumptions": [
    "string"
  ],
  "disclaimer": "string (e.g. 'Photo-based estimates are smart drafts, not final inspections.')"
}

Do not include markdown formatting like \`\`\`json in your response. Just output raw JSON.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o", // use gpt-4o for better vision
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
                max_tokens: 2000,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim() || "{}";
        const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanContent);

        return {
            ...parsed,
            aiModel: "gpt-4o",
            aiProvider: "openai",
            analysisVersion: "1.0"
        };
    } catch (error: any) {
        console.error("Vero AI Lens Analysis Error:", error);
        throw new Error(`Failed to analyze image: ${error.message}`);
    }
}

function getMockResult(tradeMode: string, customContextName?: string): VeroLensAnalysisResult {
    const modeName = customContextName || tradeMode;
    // Return a safe mock based on trade
    return {
        summary: `Mock AI identified potential ${modeName} work. Needs human verification for exact measurements.`,
        serviceCategory: modeName,
        confidenceScore: 0.85,
        detectedItems: [
            { name: "Main Area", quantity: 1, condition: "Fair", confidence: 0.9, notes: "Visible wear" }
        ],
        suggestedLineItems: [
            {
                title: "Standard Service",
                description: `Basic ${modeName} labor`,
                quantity: 1,
                unit: "hour",
                estimatedPriceLow: 50,
                estimatedPriceHigh: 150,
                confidence: 0.8
            }
        ],
        questions: [
            { question: "What is the total square footage?", required: true }
        ],
        pricingAssumptions: ["Used $50-$150 standard flat rate guidance for Mock analysis"],
        disclaimer: "Photo-based estimates are smart drafts, not final inspections.",
        aiModel: "mock-model",
        aiProvider: "mock-provider",
        analysisVersion: "1.0-mock"
    };
}

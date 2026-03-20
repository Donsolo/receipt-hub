import { NormalizedOCRData } from './ocrService';

/**
 * Extracts key fields from raw receipt text using Regex and Heuristics.
 * Used as a structured parsing layer when OpenAI JSON extraction misses fields.
 */
export function enhanceWithHeuristics(rawText: string, ocrJson: Partial<NormalizedOCRData>): NormalizedOCRData {
    let {
        merchantName,
        transactionDate,
        subtotal,
        tax,
        total,
        lineItems = [],
        confidence = ocrJson.confidence || 0.9,
    } = ocrJson;

    const rawUpper = rawText.toUpperCase();

    // 1. Fallback for Total
    if (total === null || total === undefined) {
        // Look for "TOTAL" or "AMOUNT" followed by a monetary value
        const totalMatch = rawUpper.match(/(?:TOTAL|AMOUNT|AMT)[\s:*$]+([\d,]+\.\d{2})/);
        if (totalMatch) {
            total = parseFloat(totalMatch[1].replace(',', ''));
            confidence -= 0.1; // Penalize confidence for needing heuristic fallback
        }
    }

    // 2. Fallback for Subtotal
    if (subtotal === null || subtotal === undefined && total !== null) {
        const subtotalMatch = rawUpper.match(/SUBTOTAL[\s:*$]+([\d,]+\.\d{2})/);
        if (subtotalMatch) {
            subtotal = parseFloat(subtotalMatch[1].replace(',', ''));
        }
    }

    // 3. Fallback for Tax
    if (tax === null || tax === undefined && total !== null) {
        const taxMatch = rawUpper.match(/(?:TAX|STATE TAX|SALES TAX)[\s:*$]+([\d,]+\.\d{2})/);
        if (taxMatch) {
            tax = parseFloat(taxMatch[1].replace(',', ''));
        } else if (typeof subtotal === 'number' && typeof total === 'number') {
            // Infer tax if subtotal and total exist
            const inferredTax = total - subtotal;
            if (inferredTax > 0 && inferredTax < total) {
                tax = parseFloat(inferredTax.toFixed(2));
            }
        }
    }

    // 4. Fallback for Date
    if (!transactionDate) {
        const dateMatch = rawText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        if (dateMatch) {
            // Attempt to standard YYYY-MM-DD
            try {
                const dateParts = dateMatch[1].split(/[\/\-]/);
                // Simple heuristic: if last part is 4 digits, it's year
                if (dateParts[2]?.length === 4) {
                    transactionDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
                } else if (dateParts[2]?.length === 2) {
                     transactionDate = `20${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
                }
            } catch (e) {
                transactionDate = dateMatch[1];
            }
        }
    }

    // 5. Line Item Heuristics
    // If line items were missed entirely but there's a big block of text before total
    if (lineItems.length === 0) {
        confidence -= 0.15;
    } else {
        // Clean up line items
        lineItems = lineItems.map(item => {
            // Infer missing quantities
            if (!item.quantity) item.quantity = 1;
            // Infer missing line total
            if (item.price && item.quantity && !item.total) {
                item.total = item.price * item.quantity;
            }
            return item;
        });
    }

    // Calculate final Needs Review flag
    let needsReview = false;
    
    // Confidence drops below 0.75 or missing critical fields
    if (confidence < 0.75 || !total || !merchantName) {
        needsReview = true;
    }

    // Ensure confidence stays within bounds
    confidence = Math.max(0, Math.min(1, confidence));

    return {
        ...ocrJson,
        merchantName: merchantName ?? null,
        merchantAddress: ocrJson.merchantAddress ?? null,
        phone: ocrJson.phone ?? null,
        transactionDate: transactionDate ?? null,
        subtotal: subtotal ?? null,
        tax: tax ?? null,
        total: total ?? null,
        currency: ocrJson.currency ?? null,
        paymentMethod: ocrJson.paymentMethod ?? null,
        last4: ocrJson.last4 ?? null,
        lineItems,
        confidence,
        needsReview,
        rawText: rawText
    };
}

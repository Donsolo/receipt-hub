"use server";

import { db } from "./db";
import { verifyToken } from "./auth";
import { cookies } from "next/headers";

export async function generateReportData(startDateStr: string, endDateStr: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const user = await verifyToken(token || "");

    if (!user) {
        throw new Error("Unauthorized");
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Ensure endDate covers the whole day inclusively
    endDate.setHours(23, 59, 59, 999);

    const receipts = await db.receipt.findMany({
        where: {
            userId: user.userId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            category: { select: { name: true, color: true } },
            bundles: {
                include: {
                    bundle: {
                        select: { id: true, name: true }
                    }
                }
            }
        }
    });

    console.log("Report Input Count:", receipts.length);

    // Data Quality Layer
    const validReceipts = receipts.filter(r => r.total !== null && r.date !== null);
    
    console.log("Valid Receipts:", validReceipts.length);

    const totalSpend = validReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalTax = validReceipts.reduce((sum, r) => sum + (r.total - r.subtotal), 0);

    // Group by Category
    const categoryBreakdown: Record<string, { count: number, total: number, color: string }> = {};
    // Group by Bundle
    const bundleBreakdown: Record<string, { count: number, total: number }> = {};
    // OCR Details map
    const ocrDetails: any[] = [];

    validReceipts.forEach(r => {
        // Category Map
        const catName = r.category?.name || "Uncategorized";
        if (!categoryBreakdown[catName]) {
            categoryBreakdown[catName] = { 
                count: 0, 
                total: 0, 
                color: r.category?.color || '#9CA3AF' 
            };
        }
        categoryBreakdown[catName].count += 1;
        categoryBreakdown[catName].total += (r.total || 0);

        // Bundle Map
        if (r.bundles && r.bundles.length > 0) {
            r.bundles.forEach(b => {
                const bundleName = b.bundle.name;
                if (!bundleBreakdown[bundleName]) bundleBreakdown[bundleName] = { count: 0, total: 0 };
                bundleBreakdown[bundleName].count += 1;
                bundleBreakdown[bundleName].total += (r.total || 0);
            });
        }

        // OCR Extractor Map
        if (r.ocrNormalized) {
            const ocr = r.ocrNormalized as any;
            ocrDetails.push({
                id: r.id,
                vendor: ocr.merchantName || r.clientName || "Unknown Vendor",
                date: r.date.toISOString().slice(0, 10),
                subtotal: r.subtotal || 0,
                tax: (r.total || 0) - (r.subtotal || 0),
                total: r.total || 0,
                confidence: ocr.confidence || null,
                rawText: ocr.rawText ? true : false
            });
        }
    });

    const topCategories = Object.entries(categoryBreakdown)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);

    const topBundles = Object.entries(bundleBreakdown)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);

    return {
        totalReceipts: validReceipts.length,
        totalSpend,
        totalTax,
        topCategories,
        topBundles,
        ocrDetails
    };
}

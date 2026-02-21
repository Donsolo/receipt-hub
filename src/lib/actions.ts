"use server";

import { db } from "./db";
import { revalidatePath } from "next/cache";

export async function getBusinessProfile() {
    let profile = await db.businessProfile.findFirst();

    if (!profile) {
        profile = await db.businessProfile.create({
            data: {
                businessName: "My Business",
                businessAddress: "",
                businessPhone: "",
                businessEmail: "",
            },
        });
    }

    return profile;
}

export async function updateBusinessProfile(data: {
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    logoPath?: string;
}) {
    const profile = await db.businessProfile.findFirst();
    if (profile) {
        await db.businessProfile.update({
            where: { id: profile.id },
            data: {
                businessName: data.businessName,
                businessAddress: data.businessAddress ?? "",
                businessPhone: data.businessPhone ?? "",
                businessEmail: data.businessEmail ?? "",
                logoPath: data.logoPath ?? null,
            }
        });
    }

    revalidatePath("/");
    revalidatePath("/receipt/[id]", "page");
}

export async function getNextReceiptNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const prefix = `RH-${dateStr}-`;

    const lastReceipt = await db.receipt.findFirst({
        where: { receiptNumber: { startsWith: prefix } },
        orderBy: { receiptNumber: "desc" },
    });

    if (lastReceipt && lastReceipt.receiptNumber) {
        const lastNum = parseInt(lastReceipt.receiptNumber.split("-").pop() || "0", 10);
        return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
    }
    return `${prefix}0001`;
}

export async function createReceipt(formData: {
    receiptNumber: string;
    date: Date;
    clientName?: string;
    notes?: string;
    taxType: string;
    taxValue?: number;
    subtotal: number;
    total: number;
    items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
}) {
    const { cookies } = require("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const { verifyToken } = require("./auth"); // Import verifyToken
    const user = await verifyToken(token || "");

    if (!user) throw new Error("Unauthorized");

    const receipt = await db.receipt.create({
        data: {
            userId: user.userId,
            receiptNumber: formData.receiptNumber,
            date: formData.date,
            clientName: formData.clientName,
            notes: formData.notes,
            taxType: formData.taxType,
            taxValue: formData.taxValue,
            subtotal: formData.subtotal,
            total: formData.total,
            items: {
                create: formData.items, // Prisma handles the array
            },
        },
    });

    revalidatePath("/history");
    return receipt.id;
}

export async function getReceipts(query: string) {
    const { cookies } = require("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const { verifyToken } = require("./auth");
    const user = await verifyToken(token || "");

    if (!user) return [];

    const where: any = {
        userId: user.userId,
    };

    if (query) {
        where.OR = [
            { receiptNumber: { contains: query } },
            { clientName: { contains: query } },
            // Allow searching uploaded receipts by date or other metadata if we add it later
        ];
    }

    return await db.receipt.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
}

export async function getReceipt(id: string) {
    const receipt = await db.receipt.findUnique({
        where: { id },
        include: {
            items: true,
            user: {
                select: {
                    email: true,
                    ...({ businessName: true, businessPhone: true, businessAddress: true } as any)
                }
            }
        },
    });
    return receipt as any;
}

export async function updateReceipt(id: string, formData: {
    receiptNumber: string;
    date: Date;
    clientName?: string;
    notes?: string;
    taxType: string;
    taxValue?: number;
    subtotal: number;
    total: number;
    items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
}) {
    await db.receipt.update({
        where: { id },
        data: {
            receiptNumber: formData.receiptNumber,
            date: formData.date,
            clientName: formData.clientName,
            notes: formData.notes,
            taxType: formData.taxType,
            taxValue: formData.taxValue,
            subtotal: formData.subtotal,
            total: formData.total,
            items: {
                deleteMany: {},
                create: formData.items,
            },
        },
    });

    revalidatePath(`/receipt/${id}`);
    revalidatePath("/history");
}

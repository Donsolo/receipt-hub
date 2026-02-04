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

    if (lastReceipt) {
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
    const receipt = await db.receipt.create({
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
                create: formData.items, // Prisma handles the array
            },
        },
    });

    return receipt.id;
}

export async function getReceipts(query: string) {
    const where: any = {};
    if (query) {
        where.OR = [
            { receiptNumber: { contains: query } },
            { clientName: { contains: query } },
        ];
    }

    return await db.receipt.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
}

export async function getReceipt(id: string) {
    return await db.receipt.findUnique({
        where: { id },
        include: { items: true },
    });
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

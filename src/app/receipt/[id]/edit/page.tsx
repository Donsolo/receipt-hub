import { getReceipt } from "@/lib/actions";
import { notFound } from "next/navigation";
import ReceiptForm from "@/app/create/ReceiptForm";

// Force dynamic to avoid build-time DB access
export const dynamic = "force-dynamic";

export default async function EditReceiptPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const receipt = await getReceipt(params.id);

    if (!receipt) {
        notFound();
    }

    // Transform data for ReceiptForm
    const initialData = {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber || "",
        date: receipt.date,
        clientName: receipt.clientName || "",
        notes: receipt.notes || "",
        taxType: receipt.taxType,
        taxValue: receipt.taxValue ? Number(receipt.taxValue) : null,
        items: receipt.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal)
        }))
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="md:flex md:items-center md:justify-between mb-6">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Edit Receipt
                    </h2>
                </div>
            </div>

            <ReceiptForm initialData={initialData} />
        </div>
    );
}

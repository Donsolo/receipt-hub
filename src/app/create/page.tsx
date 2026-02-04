import { getNextReceiptNumber } from "@/lib/actions";
import ReceiptForm from "./ReceiptForm";

export default async function CreateReceiptPage() {
    const nextReceiptNumber = await getNextReceiptNumber();

    return (
        <div className="max-w-3xl mx-auto">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-800">
                        New Receipt
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Create and save a receipt
                    </p>
                </div>
            </div>

            <ReceiptForm initialData={{ receiptNumber: nextReceiptNumber, date: new Date(), taxType: 'none', items: [] }} />
        </div>
    );
}

"use client";

import { useState } from "react";
import { createReceipt, updateReceipt } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface ReceiptItem {
    id: string; // temp id for key
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface ReceiptData {
    id?: string;
    receiptNumber: string;
    date: Date;
    clientName?: string | null;
    notes?: string | null;
    taxType: string;
    taxValue?: number | null; // Decimal | null
    items?: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export default function ReceiptForm({ initialData }: { initialData: ReceiptData }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const isEdit = !!initialData.id;

    // Header Fields
    const [receiptNumber, setReceiptNumber] = useState(initialData.receiptNumber);
    const [date, setDate] = useState(initialData.date ? new Date(initialData.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [clientName, setClientName] = useState(initialData.clientName || "");
    const [notes, setNotes] = useState(initialData.notes || "");

    // Items
    const [items, setItems] = useState<ReceiptItem[]>(
        initialData.items && initialData.items.length > 0
            ? initialData.items.map(i => ({ ...i, id: Math.random().toString(), unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) }))
            : [{ id: '1', description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]
    );

    // Totals
    const [taxType, setTaxType] = useState<"none" | "percent" | "flat">(initialData.taxType as any || "none");
    const [taxValue, setTaxValue] = useState<number>(initialData.taxValue ? Number(initialData.taxValue) : 0);

    // Derived state
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    let calculatedTax = 0;
    if (taxType === "percent") {
        calculatedTax = subtotal * (taxValue / 100);
    } else if (taxType === "flat") {
        calculatedTax = taxValue;
    }

    const total = subtotal + calculatedTax;

    // Update line totals when qty/price changes
    const updateItem = (id: string, field: keyof ReceiptItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    newItem.lineTotal = Number(newItem.quantity) * Number(newItem.unitPrice);
                }
                return newItem;
            }
            return item;
        }));
    };

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return; // Keep at least one
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const submitData = {
            receiptNumber,
            date: new Date(`${date}T12:00:00`),
            clientName,
            notes,
            taxType,
            taxValue,
            subtotal,
            total,
            items: items.map(({ description, quantity, unitPrice, lineTotal }) => ({
                description, quantity, unitPrice, lineTotal
            })),
        };

        try {
            if (isEdit && initialData.id) {
                await updateReceipt(initialData.id, submitData);
                router.push(`/receipt/${initialData.id}`);
            } else {
                const receiptId = await createReceipt(submitData);
                router.push(`/receipt/${receiptId}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to save receipt.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section: Header Info */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Receipt Number</label>
                        <input
                            type="text"
                            required
                            value={receiptNumber}
                            onChange={e => setReceiptNumber(e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Client Name</label>
                    <input
                        type="text"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                        placeholder="Client or Company Name"
                    />
                </div>
            </div>

            {/* Section: Line Items */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Items</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 table-fixed">
                        <thead className="bg-white">
                            <tr>
                                <th className="pl-4 pr-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">Description</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sm:w-24">Qty</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 sm:w-32">Price</th>
                                <th className="pl-2 pr-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 sm:w-32">Total</th>
                                <th className="px-2 py-3 w-8 sm:w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {items.map((item) => (
                                <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="pl-4 pr-2 py-3">
                                        <input
                                            type="text"
                                            required
                                            value={item.description}
                                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                                            className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded text-sm py-2 px-3 text-gray-900 bg-white"
                                            placeholder="Item description"
                                        />
                                    </td>
                                    <td className="px-2 py-3">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={item.quantity}
                                            onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                            className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded text-sm py-2 px-2 text-right text-gray-900 bg-white"
                                        />
                                    </td>
                                    <td className="px-2 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            value={item.unitPrice}
                                            onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                            className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded text-sm py-2 px-2 text-right text-gray-900 bg-white"
                                        />
                                    </td>
                                    <td className="pl-2 pr-4 py-3 text-right text-sm font-medium text-gray-900 truncate">
                                        {item.lineTotal.toFixed(2)}
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                &times;
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <button type="button" onClick={addItem} className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center">
                        <span className="mr-1 text-lg leading-none">+</span> Add Item
                    </button>
                </div>
            </div>

            {/* Section: Totals & Notes */}
            <div className="flex flex-col md:flex-row gap-8">
                {/* Notes */}
                <div className="w-full md:w-1/2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
                    <textarea
                        rows={4}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm p-3 text-gray-900 bg-white"
                        placeholder="Payment terms, thank you message, etc."
                    ></textarea>
                </div>

                {/* Totals */}
                <div className="w-full md:w-1/2">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="text-gray-900 font-medium">{subtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm pt-2">
                                <div className="flex items-center space-x-3">
                                    <label htmlFor="taxType" className="text-gray-500 font-medium">Tax:</label>
                                    <select
                                        id="taxType"
                                        value={taxType}
                                        onChange={e => setTaxType(e.target.value as any)}
                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 py-1 pl-2 pr-8 bg-white"
                                    >
                                        <option value="none">None</option>
                                        <option value="percent">%</option>
                                        <option value="flat">Flat ($)</option>
                                    </select>
                                    {taxType !== 'none' && (
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={taxValue}
                                            onChange={e => setTaxValue(Number(e.target.value))}
                                            placeholder="0.00"
                                            className="w-20 text-sm border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 py-1 px-2 text-right text-gray-900 bg-white"
                                        />
                                    )}
                                </div>
                                <span className="text-gray-900 font-medium">{calculatedTax.toFixed(2)}</span>
                            </div>

                            <div className="pt-4 border-t border-gray-200 mt-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-base font-bold text-gray-900">Total</span>
                                    <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
                <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                        "w-full sm:w-auto ml-auto flex justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors",
                        loading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {loading ? "Saving..." : (isEdit ? "Update Receipt" : "Create Receipt")}
                </button>
            </div>
        </form>
    );
}

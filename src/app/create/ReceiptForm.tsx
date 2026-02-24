"use client";

import { useState, useRef, useEffect } from "react";
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
    categoryId?: string | null;
    items?: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

// Hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
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
    const [categoryId, setCategoryId] = useState(initialData.categoryId || "");

    // Categories State
    const [categories, setCategories] = useState<{ id: string, name: string, color: string | null }[]>([]);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        fetchCategories();
    }, []);

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategoryLoading(true);
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName.trim() })
            });
            if (res.ok) {
                const newCat = await res.json();
                setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
                setCategoryId(newCat.id);
                setIsCreatingCategory(false);
                setNewCategoryName("");
            } else {
                alert("Failed to create category. It might already exist.");
            }
        } catch (error) {
            console.error("Create category error:", error);
            alert("Error creating category.");
        } finally {
            setCreatingCategoryLoading(false);
        }
    };

    // Items
    const [items, setItems] = useState<ReceiptItem[]>(
        initialData.items && initialData.items.length > 0
            ? initialData.items.map(i => ({ ...i, id: Math.random().toString(), unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) }))
            : [{ id: '1', description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]
    );

    // Totals
    const [taxType, setTaxType] = useState<"none" | "percent" | "flat">(initialData.taxType as any || "none");
    const [taxValue, setTaxValue] = useState<number>(initialData.taxValue ? Number(initialData.taxValue) : 0);

    // Auto-Populate State
    const [activeInputId, setActiveInputId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

    const debouncedQuery = useDebounce(searchQuery, 250);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!activeInputId) {
                setSuggestions([]);
                return;
            }
            try {
                const queryStr = debouncedQuery ? debouncedQuery : "";
                const res = await fetch(`/api/items/suggest?q=${encodeURIComponent(queryStr)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions", error);
            }
        };
        fetchSuggestions();
    }, [debouncedQuery, activeInputId]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setSuggestions([]);
                setActiveInputId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

        if (field === 'description') {
            setActiveInputId(id);
            setSearchQuery(value as string);
            setActiveSuggestionIndex(-1);
            if (!value) setSuggestions([]);
        }
    };

    const handleSelectSuggestion = (id: string, value: string) => {
        updateItem(id, 'description', value);
        setSuggestions([]);
        setActiveInputId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (!activeInputId || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
            e.preventDefault();
            handleSelectSuggestion(id, suggestions[activeSuggestionIndex]);
        } else if (e.key === 'Escape') {
            setSuggestions([]);
            setActiveInputId(null);
        }
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
            categoryId: categoryId || null,
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (Main Input Area) */}
            <div className="lg:col-span-2 space-y-6">
                {/* Section: Header Info */}
                <div className="bg-[#111A2B] rounded-2xl border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 space-y-6">
                    <div>
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Receipt Details</h3>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Receipt Number</label>
                                <input
                                    type="text"
                                    required
                                    value={receiptNumber}
                                    onChange={e => setReceiptNumber(e.target.value)}
                                    className="block w-full border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-white bg-[#182338] placeholder-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="block w-full border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-white bg-[#182338] [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-xs font-medium text-white/60 mb-1">Client Name</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                className="block w-full border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-white bg-[#182338] placeholder-white/30"
                                placeholder="Client or Company Name"
                            />
                        </div>

                        <div className="mt-6">
                            <label className="block text-xs font-medium text-white/60 mb-1">Category</label>
                            {!isCreatingCategory ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={categoryId}
                                        onChange={e => {
                                            if (e.target.value === 'CREATE_NEW') {
                                                setIsCreatingCategory(true);
                                            } else {
                                                setCategoryId(e.target.value);
                                            }
                                        }}
                                        className="block w-full border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-white bg-[#182338]"
                                    >
                                        <option value="">None</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                        <option value="CREATE_NEW" className="font-semibold text-blue-400">+ Create New Category</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        placeholder="New Category Name"
                                        className="block w-full border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-white bg-[#182338] placeholder-white/30"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCreateCategory();
                                            } else if (e.key === 'Escape') {
                                                setIsCreatingCategory(false);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={creatingCategoryLoading}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {creatingCategoryLoading ? 'Saving...' : 'Add'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingCategory(false)}
                                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section: Line Items */}
                <div className="bg-[#111A2B] rounded-2xl border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Line Items</h3>
                    <div className="bg-[#0F1725] rounded-xl border border-white/5 overflow-visible">
                        <div className="w-full">
                            <table className="min-w-full table-fixed divide-y divide-white/5">
                                <thead>
                                    <tr>
                                        <th className="pl-4 pr-2 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider w-auto">Description</th>
                                        <th className="px-2 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider w-20 sm:w-24">Qty</th>
                                        <th className="px-2 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider w-24 sm:w-32">Price</th>
                                        <th className="pl-2 pr-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider w-24 sm:w-32">Total</th>
                                        <th className="px-2 py-3 w-8 sm:w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {items.map((item) => (
                                        <tr key={item.id} className="group hover:bg-[var(--bg-surface)] transition-colors">
                                            <td className="pl-4 pr-2 py-3">
                                                <div className="relative w-full">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={item.description}
                                                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                        onFocus={() => {
                                                            setActiveInputId(item.id);
                                                            setSearchQuery(item.description);
                                                        }}
                                                        onKeyDown={e => handleKeyDown(e, item.id)}
                                                        className="w-full border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 rounded text-sm py-2 px-3 text-[var(--text-primary)] bg-[var(--bg-surface)] placeholder-gray-500 relative z-10"
                                                        placeholder="Item description"
                                                        autoComplete="off"
                                                    />

                                                    {/* Dropdown Suggestions */}
                                                    {activeInputId === item.id && suggestions.length > 0 && (
                                                        <div ref={wrapperRef} className="absolute left-0 right-0 top-full mt-1 bg-[#1E293B] border border-gray-600/50 rounded-md shadow-2xl z-[100] overflow-hidden">
                                                            <ul className="py-1">
                                                                {suggestions.map((suggestion, idx) => (
                                                                    <li
                                                                        key={idx}
                                                                        onClick={() => handleSelectSuggestion(item.id, suggestion)}
                                                                        onMouseEnter={() => setActiveSuggestionIndex(idx)}
                                                                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${idx === activeSuggestionIndex
                                                                            ? 'bg-indigo-600/20 text-indigo-300'
                                                                            : 'text-gray-300 hover:bg-white/5'
                                                                            }`}
                                                                    >
                                                                        {suggestion}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                    className="w-full border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 rounded text-sm py-2 px-2 text-right text-[var(--text-primary)] bg-[var(--bg-surface)]"
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
                                                    className="w-full border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 rounded text-sm py-2 px-2 text-right text-[var(--text-primary)] bg-[var(--bg-surface)]"
                                                />
                                            </td>
                                            <td className="pl-2 pr-4 py-3 text-right text-sm font-medium text-[var(--text-primary)] truncate">
                                                {item.lineTotal.toFixed(2)}
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-red-500 p-1">
                                                        &times;
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-[var(--bg-surface)] px-6 py-3 border-t border-[var(--border-subtle)]">
                            <button type="button" onClick={addItem} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center">
                                <span className="mr-1 text-lg leading-none">+</span> Add Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column (Sidebar Area) */}
            <div className="lg:col-span-1 space-y-6">

                {/* Section: Totals */}
                <div className="bg-[#111A2B] rounded-2xl border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 space-y-6">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Summary</h3>

                    <div className="bg-[#0F1725] rounded-xl border border-white/5 p-6 space-y-4">
                        <div className="flex justify-between items-center text-sm text-white/70">
                            <span>Subtotal</span>
                            <span className="font-medium text-white">{subtotal.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm text-white/70">
                            <div className="flex items-center space-x-3">
                                <label htmlFor="taxType" className="font-medium">Tax:</label>
                                <select
                                    id="taxType"
                                    value={taxType}
                                    onChange={e => setTaxType(e.target.value as any)}
                                    className="text-sm border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 py-1 pl-2 pr-8 bg-[#182338] text-white transition-all duration-150"
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
                                        className="w-20 text-sm border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 py-1 px-2 text-right bg-[#182338] text-white transition-all duration-150"
                                    />
                                )}
                            </div>
                            <span className="font-medium text-white">{calculatedTax.toFixed(2)}</span>
                        </div>

                        <div className="h-px bg-white/10 my-4" />

                        <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-white">Total</span>
                            <span className="text-3xl font-bold text-blue-400 tracking-tight">{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Section: Notes */}
                <div className="bg-[#111A2B] rounded-2xl border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 space-y-6">
                    <div>
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Additional Info</h3>
                        <label className="block text-xs font-medium text-white/60 mb-2">Notes</label>
                        <textarea
                            rows={4}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="block w-full border border-white/5 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm p-3 text-white bg-[#182338] placeholder-white/30"
                            placeholder="Payment terms, thank you message, etc."
                        ></textarea>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                        {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save & Prepare PDF')}
                    </button>
                    {isEdit && (
                        <button
                            type="button"
                            onClick={() => router.push(`/history`)}
                            className="mt-4 w-full flex justify-center py-3 px-4 border border-white/10 rounded-xl shadow-sm text-sm font-medium text-white/70 bg-transparent hover:bg-white/5 hover:text-white transition-all duration-200"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}

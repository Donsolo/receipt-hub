"use client";

import { useState, useRef, useEffect } from "react";
import { createReceipt, updateReceipt } from "@/lib/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { useFeatures } from "@/hooks/useFeatures";

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
    discountType?: string;
    discountValue?: number | null;
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

export default function ReceiptForm({ initialData, user }: { initialData: ReceiptData, user?: any }) {
    const router = useRouter();
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrData, setOcrData] = useState<any | null>(null);
    const [showOcrModal, setShowOcrModal] = useState(false);
    const isEdit = !!initialData.id;

    const features = useFeatures(user);

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
    const [activeEditItemId, setActiveEditItemId] = useState<string | null>(null);

    // Totals
    const [taxType, setTaxType] = useState<"none" | "percent" | "flat">(initialData.taxType as any || "none");
    const [taxValue, setTaxValue] = useState<number>(initialData.taxValue ? Number(initialData.taxValue) : 0);
    const [discountType, setDiscountType] = useState<"none" | "percent" | "flat">(initialData.discountType as any || "none");
    const [discountValue, setDiscountValue] = useState<number>(initialData.discountValue ? Number(initialData.discountValue) : 0);

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

    let calculatedDiscount = 0;
    // Assume `discountType` and `discountValue` exist in state
    if (discountType === "percent") {
        calculatedDiscount = subtotal * (discountValue / 100);
    } else if (discountType === "flat") {
        calculatedDiscount = discountValue;
    }

    const subtotalAfterDiscount = Math.max(0, subtotal - calculatedDiscount);

    let calculatedTax = 0;
    if (taxType === "percent") {
        calculatedTax = subtotalAfterDiscount * (taxValue / 100);
    } else if (taxType === "flat") {
        calculatedTax = taxValue;
    }

    const total = subtotalAfterDiscount + calculatedTax;

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
        const newId = Date.now().toString();
        setItems(prev => [
            ...prev,
            { id: newId, description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }
        ]);
        setActiveEditItemId(newId);
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
            discountType,
            discountValue,
            subtotal,
            total,
            items: items.map(({ description, quantity, unitPrice, lineTotal }) => ({
                description, quantity, unitPrice, lineTotal
            })),
            ocrNormalized: ocrData || undefined,
            sourceType: ocrData ? "ocr" : undefined
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

    const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so the same file can be selected again if needed
        e.target.value = '';

        if (!features.ocr) {
            alert("OCR Scanning is only available in Professional Mode.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image size must be less than 5MB.");
            return;
        }

        setOcrLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/receipts/scan', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to parse receipt");
            }

            const data = await res.json();
            const normalized = data.normalized;

            if (!normalized) {
                throw new Error("Invalid response format from OCR service.");
            }

            setOcrData(normalized);
            setShowOcrModal(true);

        } catch (error: any) {
            console.error("OCR Error:", error);
            alert(error.message || "An error occurred during OCR scanning.");
        } finally {
            setOcrLoading(false);
        }
    };

    const applyOcrData = () => {
        if (!ocrData) return;

        if (ocrData.merchantName) {
            setClientName(ocrData.merchantName);
        }
        if (ocrData.transactionDate) {
            const parsedDate = new Date(ocrData.transactionDate);
            if (!isNaN(parsedDate.getTime())) {
                setDate(parsedDate.toISOString().slice(0, 10));
            }
        }
        if (ocrData.tax !== null && ocrData.tax !== undefined) {
            setTaxType("flat");
            setTaxValue(Number(ocrData.tax));
        }

        if (ocrData.lineItems && ocrData.lineItems.length > 0) {
            setItems(ocrData.lineItems.map((item: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                description: item.description || "Item",
                quantity: item.quantity || 1,
                unitPrice: item.price !== null && item.price !== undefined ? Number(item.price) : (item.total ? Number(item.total) : 0),
                lineTotal: item.total !== null && item.total !== undefined ? Number(item.total) : (item.price ? Number(item.price) : 0)
            })));
        } else if (ocrData.total !== null && ocrData.total !== undefined) {
            setItems([{
                id: Math.random().toString(36).substr(2, 9),
                description: "Receipt Total",
                quantity: 1,
                unitPrice: Number(ocrData.total),
                lineTotal: Number(ocrData.total)
            }]);
        }

        setShowOcrModal(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Main Input Area) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* OCR Scan Action (Top of Form) */}
                    <div className={`bg-[var(--card)] rounded-2xl border ${features.ocr ? 'border-yellow-500/20' : 'border-[var(--border)]'} shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative`}>

                        <div className="flex items-start gap-4 relative z-10 w-full sm:w-auto">
                            <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-inner border ${features.ocr ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-white/5 text-[var(--muted)] border-[var(--border)]'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="flex flex-col items-start mt-0.5">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className={`text-sm font-semibold tracking-tight ${features.ocr ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>Smart Scan (OCR)</h3>
                                    {features.ocr && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                            PRO Feature
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm">Scan a physical receipt using your camera or upload an image.</p>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center justify-end w-full sm:w-auto">
                            {features.ocr ? (
                                <div className="flex flex-col w-full sm:w-auto gap-3">
                                    <button
                                        type="button"
                                        onClick={() => cameraInputRef.current?.click()}
                                        disabled={ocrLoading}
                                        className={`w-full sm:w-auto px-5 py-2.5 bg-transparent border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm ${ocrLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        {ocrLoading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Analyzing receipt...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Scan with Camera
                                            </>
                                        )}
                                    </button>

                                    {!ocrLoading && (
                                        <label className={`w-full sm:w-auto cursor-pointer px-5 py-2.5 bg-transparent border border-[var(--border)] hover:border-white/20 hover:bg-[var(--card-hover)] text-[var(--muted)] hover:text-[var(--text)] text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Upload Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleOCRUpload} disabled={ocrLoading} />
                                        </label>
                                    )}

                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        ref={cameraInputRef}
                                        onChange={handleOCRUpload}
                                        className="hidden"
                                        disabled={ocrLoading}
                                    />
                                </div>
                            ) : (
                                <Link href="/upgrade" className="px-3 py-1.5 bg-white/5 border border-[var(--border)] text-[var(--muted)] text-xs font-medium rounded-lg hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors flex items-center gap-1.5" title="Available in Professional Mode">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    PRO Only
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Section: Header Info */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 space-y-6">
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
                                        className="block w-full border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)] placeholder-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="block w-full border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)] [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="block text-xs font-medium text-white/60 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    className="block w-full border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)] placeholder-white/30"
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
                                            className="block w-full border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)]"
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
                                            className="block w-full border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 transition-all duration-150 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)] placeholder-white/30"
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
                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-[var(--text)] text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {creatingCategoryLoading ? 'Saving...' : 'Add'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingCategory(false)}
                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-[var(--text)] text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Line Items */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 sm:p-6 mb-24 lg:mb-0">
                        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-4">Line Items</h3>
                        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                            
                            {/* Grid Header */}
                            <div className="grid grid-cols-4 sm:grid-cols-12 gap-2 px-4 py-3 bg-[var(--card)] border-b border-[var(--border)] text-[10px] sm:text-xs font-medium text-[var(--muted)] uppercase tracking-wider items-center">
                                <div className="col-span-2 sm:col-span-5">Item Name</div>
                                <div className="col-span-1 sm:col-span-2 text-center">Qty</div>
                                <div className="col-span-1 sm:col-span-3 text-right">Price</div>
                                <div className="hidden sm:block col-span-2 text-right">Total</div>
                            </div>

                            <div className="divide-y divide-white/10">
                                {items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setActiveEditItemId(item.id)}
                                        className="group hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 cursor-pointer transition-colors px-4 py-3 grid grid-cols-4 sm:grid-cols-12 gap-2 items-center relative"
                                    >
                                        <div className="col-span-2 sm:col-span-5 w-full pr-2 text-sm text-[var(--text)] font-medium truncate">
                                            {item.description || <span className="text-[var(--muted)] italic">No description</span>}
                                        </div>
                                        <div className="col-span-1 sm:col-span-2 text-center text-sm text-[var(--text)] tabular-nums">
                                            {item.quantity}
                                        </div>
                                        <div className="col-span-1 sm:col-span-3 lg:col-span-2 text-right text-sm text-[var(--text)] tabular-nums font-medium">
                                            {item.unitPrice !== null && item.unitPrice !== undefined ? `$${item.unitPrice.toFixed(2)}` : '-'}
                                        </div>
                                        <div className="hidden sm:block col-span-2 text-right text-sm text-[var(--text)] font-semibold tabular-nums">
                                            ${item.lineTotal.toFixed(2)}
                                        </div>
                                        <div className="hidden lg:flex col-span-1 justify-center items-center">
                                            {items.length > 1 && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-[var(--muted)] hover:text-red-500 p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                        {/* Mobile Tap Indicator */}
                                        <div className="lg:hidden absolute inset-y-0 right-2 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[var(--card)] px-4 py-3 border-t border-[var(--border)]">
                                <button type="button" onClick={addItem} className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center transition-colors">
                                    <span className="mr-1.5 text-lg leading-none">+</span> Add Line Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Sidebar Area) */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Section: Totals */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_-10px_30px_rgba(0,0,0,0.35)] lg:shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 space-y-6 sticky bottom-4 z-[40] lg:static lg:bottom-auto">
                        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-4">Summary</h3>

                        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-4">
                            <div className="flex justify-between items-center text-sm text-[var(--muted)]">
                                <span>Subtotal</span>
                                <span className="font-medium text-[var(--text)]">{subtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm text-[var(--muted)]">
                                <div className="flex items-center space-x-3">
                                    <label htmlFor="discountType" className="font-medium text-red-400">Discount:</label>
                                    <select
                                        id="discountType"
                                        value={discountType}
                                        onChange={e => setDiscountType(e.target.value as any)}
                                        className="text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 py-1 pl-2 pr-8 bg-[var(--card)] text-[var(--text)] transition-all duration-150"
                                    >
                                        <option value="none">None</option>
                                        <option value="percent">%</option>
                                        <option value="flat">Flat ($)</option>
                                    </select>
                                    {discountType !== 'none' && (
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={discountValue}
                                            onChange={e => setDiscountValue(Number(e.target.value))}
                                            placeholder="0.00"
                                            className="w-20 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 py-1 px-2 text-right bg-[var(--card)] text-[var(--text)] transition-all duration-150"
                                        />
                                    )}
                                </div>
                                <span className="font-medium text-red-400">-{calculatedDiscount.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm text-[var(--muted)]">
                                <div className="flex items-center space-x-3">
                                    <label htmlFor="taxType" className="font-medium">Tax:</label>
                                    <select
                                        id="taxType"
                                        value={taxType}
                                        onChange={e => setTaxType(e.target.value as any)}
                                        className="text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 py-1 pl-2 pr-8 bg-[var(--card)] text-[var(--text)] transition-all duration-150"
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
                                            className="w-20 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 py-1 px-2 text-right bg-[var(--card)] text-[var(--text)] transition-all duration-150"
                                        />
                                    )}
                                </div>
                                <span className="font-medium text-[var(--text)]">{calculatedTax.toFixed(2)}</span>
                            </div>

                            <div className="h-px bg-[var(--border)] my-4" />

                            <div className="flex justify-between items-center">
                                <span className="text-base font-semibold text-[var(--text)]">Total</span>
                                <span className="text-3xl font-bold text-blue-400 tracking-tight">{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section: Notes */}
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 space-y-6">
                        <div>
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Additional Info</h3>
                            <label className="block text-xs font-medium text-white/60 mb-2">Notes</label>
                            <textarea
                                rows={4}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="block w-full border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150 sm:text-sm p-3 text-[var(--text)] bg-[var(--card)] placeholder-white/30"
                                placeholder="Payment terms, thank you message, etc."
                            ></textarea>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] text-sm font-medium text-[var(--text)] bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save & Prepare PDF')}
                        </button>
                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => router.push(`/history`)}
                                className="mt-4 w-full flex justify-center py-3 px-4 border border-[var(--border)] rounded-xl shadow-sm text-sm font-medium text-white/70 bg-transparent hover:bg-[var(--card-hover)] hover:text-[var(--text)] transition-all duration-200"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {/* OCR Review Modal */}
            {showOcrModal && ocrData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--bg)]/60 backdrop-blur-sm">
                    <div className="bg-[var(--card)] border border-[var(--border)] shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
                            <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Review Scanned Receipt</h2>
                            <button type="button" onClick={() => { setShowOcrModal(false); setOcrData(null); }} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {ocrData.needsReview && (
                            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-amber-500">We couldn't fully verify this receipt</p>
                                    <p className="text-xs text-amber-500/80 mt-1">Please review the extracted quantities, prices, and totals carefully before saving. Some fields may be missing or inaccurate.</p>
                                </div>
                            </div>
                        )}

                        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar flex-1">
                            {/* Merchant Details */}
                            <div>
                                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Merchant Info</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)]">
                                    <div>
                                        <p className="text-xs text-[var(--muted)] mb-1">Name</p>
                                        <p className="text-sm text-[var(--text)] font-medium">{ocrData.merchantName || "Unknown Merchant"}</p>
                                    </div>
                                    <div className="sm:row-span-2">
                                        <p className="text-xs text-[var(--muted)] mb-1">Address</p>
                                        <p className="text-sm text-[var(--text)]">{ocrData.merchantAddress || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--muted)] mb-1">Phone</p>
                                        <p className="text-sm text-[var(--text)]">{ocrData.phone || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Details */}
                            <div>
                                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Transaction Info</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)]">
                                    <div>
                                        <p className="text-xs text-[var(--muted)] mb-1">Date</p>
                                        <p className="text-sm text-[var(--text)]">{ocrData.transactionDate || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--muted)] mb-1">Method</p>
                                        <p className="text-sm text-[var(--text)]">
                                            {ocrData.paymentMethod ? `${ocrData.paymentMethod} ${ocrData.last4 ? '(*' + ocrData.last4 + ')' : ''}` : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--muted)] mb-1">Tax</p>
                                        <p className="text-sm text-[var(--text)]">{ocrData.tax !== null ? `$${Number(ocrData.tax).toFixed(2)}` : "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--muted)] mb-1">Total</p>
                                        <p className="text-base text-[var(--text)] font-bold tracking-tight">{ocrData.total !== null ? `$${Number(ocrData.total).toFixed(2)}` : "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            {ocrData.lineItems && ocrData.lineItems.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Extracted Items</h3>
                                    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
                                        <table className="min-w-full divide-y divide-white/10">
                                            <thead className="bg-[var(--card)]">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted)]">Description</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--muted)]">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--muted)]">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--muted)]">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {ocrData.lineItems.map((item: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 text-sm text-[var(--text)]">{item.description || "N/A"}</td>
                                                        <td className="px-4 py-3 text-sm text-[var(--text)] text-right">{item.quantity || 1}</td>
                                                        <td className="px-4 py-3 text-sm text-[var(--text)] text-right">{item.price !== null ? `$${Number(item.price).toFixed(2)}` : "-"}</td>
                                                        <td className="px-4 py-3 text-sm text-[var(--text)] font-medium text-right">{item.total !== null ? `$${Number(item.total).toFixed(2)}` : "-"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowOcrModal(false); setOcrData(null); }}
                                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors order-3 sm:order-1"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowOcrModal(false)}
                                className="px-4 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors order-2"
                            >
                                Edit Before Applying
                            </button>
                            <button
                                type="button"
                                onClick={applyOcrData}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-[var(--text)] rounded-lg text-sm font-bold shadow-[0_4px_14px_rgba(37,99,235,0.39)] transition-all order-1 sm:order-3"
                            >
                                Apply to Form
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Line Item Modal */}
            {activeEditItemId && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {(() => {
                            const item = items.find(i => i.id === activeEditItemId);
                            if (!item) return null;
                            return (
                                <>
                                    <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]">
                                        <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Edit Line Item</h2>
                                        <button type="button" onClick={() => setActiveEditItemId(null)} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--muted)] uppercase mb-2">Item Name</label>
                                            <div className="relative" ref={wrapperRef}>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={item.description}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    onKeyDown={e => handleKeyDown(e, item.id)}
                                                    className="w-full border border-[var(--border)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm px-4 py-3 bg-[var(--card)] text-[var(--text)]"
                                                    placeholder="Brief description..."
                                                />
                                                {features.smartCategories && activeInputId === item.id && suggestions.length > 0 && (
                                                    <ul className="absolute z-[110] w-full bg-[var(--card)] border border-[var(--border)] mt-1 rounded-lg shadow-xl overflow-y-auto py-1 max-h-48">
                                                        {suggestions.map((s, idx) => (
                                                            <li
                                                                key={idx}
                                                                onClick={(e) => { e.stopPropagation(); handleSelectSuggestion(item.id, s); }}
                                                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${idx === activeSuggestionIndex ? 'bg-blue-600 text-white' : 'text-[var(--text)] hover:bg-[var(--card-hover)]'}`}
                                                            >
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-[var(--muted)] uppercase mb-2">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                    className="w-full border border-[var(--border)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm px-4 py-3 bg-[var(--card)] text-[var(--text)] tabular-nums"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-[var(--muted)] uppercase mb-2">Unit Price ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                    className="w-full border border-[var(--border)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm px-4 py-3 bg-[var(--card)] text-[var(--text)] tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex justify-between items-center border-t border-[var(--border)]">
                                            <div className="text-sm text-[var(--muted)]">Line Total</div>
                                            <div className="text-xl font-semibold tabular-nums text-[var(--text)]">${item.lineTotal.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 bg-[var(--card)] border-t border-[var(--border)] flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { removeItem(item.id); setActiveEditItemId(null); }}
                                            className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium rounded-lg text-sm transition-colors"
                                        >
                                            Delete Item
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveEditItemId(null)}
                                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-md transition-all shadow-blue-500/20"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </>
    );
}

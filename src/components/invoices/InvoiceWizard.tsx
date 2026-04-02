"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { compressToWebp } from '@/lib/imageOpt';

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

export interface InvoiceItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface InvoiceWizardProps {
    isPro?: boolean;
    businessName?: string;
    businessLogoPath?: string;
    businessRegistrationNumber?: string;
    initialData?: {
        id?: string;
        clientName: string;
        clientEmail: string;
        clientCompany?: string;
        clientPhone?: string;
        clientAddress?: string;
        clientPropertyAddress?: string;
        title: string;
        description: string;
        issueDate: string;
        dueDate: string;
        notes: string;
        attachedPhotos?: string[];
        tax: number;
        discountType?: string;
        discountValue?: number;
        items: InvoiceItem[];
        status?: string;
    };
}

export default function InvoiceWizard({ isPro = false, businessName, businessLogoPath, businessRegistrationNumber, initialData }: InvoiceWizardProps) {
    const router = useRouter();
    const isEdit = !!initialData?.id;

    const [step, setStep] = useState(isEdit ? 3 : 1);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1: Client Info
    const [clientName, setClientName] = useState(initialData?.clientName || '');
    const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '');
    const [clientCompany, setClientCompany] = useState(initialData?.clientCompany || '');
    const [clientPhone, setClientPhone] = useState(initialData?.clientPhone || '');
    const [clientAddress, setClientAddress] = useState(initialData?.clientAddress || '');
    const [clientPropertyAddress, setClientPropertyAddress] = useState(initialData?.clientPropertyAddress || '');
    const [propertyDifferent, setPropertyDifferent] = useState(!!initialData?.clientPropertyAddress);

    // Step 2: Details
    const [title, setTitle] = useState(initialData?.title || 'Invoice');
    const [description, setDescription] = useState(initialData?.description || '');
    const [issueDate, setIssueDate] = useState(initialData?.issueDate ? new Date(initialData.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [dueDate, setDueDate] = useState(initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 10) : '');

    // Step 3: Items
    const [items, setItems] = useState<InvoiceItem[]>(initialData?.items?.length ? initialData.items : [{ id: '1', name: '', description: '', quantity: 1, unitPrice: 0 }]);
    const [tax, setTax] = useState(initialData?.tax || 0);
    const [discountType, setDiscountType] = useState<"none" | "percent" | "flat">(initialData?.discountType as any || "none");
    const [discountValue, setDiscountValue] = useState<number>(initialData?.discountValue || 0);
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [attachedPhotos, setAttachedPhotos] = useState<string[]>(initialData?.attachedPhotos || []);

    // Smart Autofill State
    const [activeInputId, setActiveInputId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const debouncedQuery = useDebounce(searchQuery, 250);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    // Calculations
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    }, [items]);

    const calculatedDiscount = useMemo(() => {
        if (discountType === "percent") {
            return subtotal * ((discountValue || 0) / 100);
        } else if (discountType === "flat") {
            return discountValue || 0;
        }
        return 0;
    }, [subtotal, discountType, discountValue]);

    const subtotalAfterDiscount = Math.max(0, subtotal - calculatedDiscount);
    const total = subtotalAfterDiscount + Number(tax);

    // Handlers
    const addItem = () => {
        setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: '', description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

        if (field === 'name') {
            setActiveInputId(id);
            setSearchQuery(value as string);
            setActiveSuggestionIndex(-1);
            if (!value) setSuggestions([]);
        }
    };

    const handleSelectSuggestion = (id: string, value: string) => {
        updateItem(id, 'name', value);
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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        try {
            const compressedPhotos = await Promise.all(
                files.map(file => compressToWebp(file))
            );
            setAttachedPhotos(prev => [...prev, ...compressedPhotos]);
        } catch (error) {
            console.error("Failed to compress and upload photos", error);
            alert("Failed to process one or more photos. Please try again.");
        }
    };

    const handleNext = () => {
        if (step === 1 && !clientName.trim()) return alert('Client Name is required');
        if (step === 2 && (!title.trim() || !issueDate)) return alert('Title and Issue Date are required');
        if (step === 3) {
            if (items.some(i => !i.name.trim() || i.quantity <= 0)) {
                return alert('All items must have a name and a valid quantity');
            }
        }
        setStep(s => Math.min(s + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setStep(s => Math.max(s - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (targetStatus: 'DRAFT' | 'SENT') => {
        if (!clientName.trim() || !title.trim() || !issueDate) return alert('Missing required fields');
        if (items.some(i => !i.name.trim() || i.quantity <= 0)) return alert('Invalid line items');

        setIsSaving(true);
        try {
            const payload = {
                clientName,
                clientEmail,
                clientCompany,
                clientPhone,
                clientAddress,
                clientPropertyAddress: propertyDifferent ? clientPropertyAddress : '',
                title,
                description,
                issueDate: new Date(issueDate).toISOString(),
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                discountType,
                discountValue,
                tax: Number(tax),
                notes,
                attachedPhotos,
                status: targetStatus,
                items
            };

            const endpoint = isEdit ? `/api/invoices/${initialData.id}` : '/api/invoices/create';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save invoice');
            }

            const data = await res.json();
            // Redirect to invoice viewer/dashboard
            router.push('/dashboard/invoices');
            router.refresh();

        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto pb-24 relative select-none sm:select-auto">
            
            {/* Top Stepper Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[var(--border)] z-0 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-500 rounded-full" 
                            style={{ width: `${((step - 1) / 3) * 100}%` }}
                        />
                    </div>
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => {
                                    if (isEdit || s < step) {
                                        setStep(s);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                    step === s ? "bg-blue-600 text-white shadow-blue-500/30 scale-110" : 
                                    step > s ? "bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer" : "bg-[var(--card)] border-2 border-[var(--border)] text-[var(--muted)]",
                                    (isEdit || s < step) && step !== s ? "cursor-pointer hover:border-blue-400 hover:text-blue-500" : (step < s ? "cursor-default" : "")
                                )}
                            >
                                {step > s ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : s}
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-3 px-1 text-[10px] sm:text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    <span>Client</span>
                    <span>Details</span>
                    <span>Items</span>
                    <span>Review</span>
                </div>
            </div>

            {/* Main Card Area */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-lg p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                
                {/* STEP 1: CLIENT INFO */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text)]">Client Information</h2>
                            <p className="text-sm text-[var(--muted)] mt-1">Who is this invoice for?</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Primary Contact Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={clientName} 
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Company Name (Optional)</label>
                                <input 
                                    type="text" 
                                    value={clientCompany} 
                                    onChange={(e) => setClientCompany(e.target.value)}
                                    placeholder="Acme Corp LLC"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Contact Email (Optional)</label>
                                <input 
                                    type="email" 
                                    value={clientEmail} 
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    placeholder="billing@acmecorp.com"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Phone Number (Optional)</label>
                                <input 
                                    type="tel" 
                                    value={clientPhone} 
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            
                            <div className="md:col-span-2 pt-2 border-t border-[var(--border)] mt-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Billing Address (Optional)</label>
                                <textarea 
                                    value={clientAddress} 
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    placeholder="123 Financial District&#10;Suite 400&#10;New York, NY 10004"
                                    rows={2}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setPropertyDifferent(!propertyDifferent)}
                                    className="w-10 h-6 bg-[var(--border)] rounded-full relative transition-colors border border-black/5 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
                                    style={{ backgroundColor: propertyDifferent ? '#3b82f6' : undefined }}
                                >
                                    <span className={clsx("absolute top-[3px] left-[3px] bg-white w-4 h-4 rounded-full transition-transform shadow-md", propertyDifferent && "translate-x-4")} />
                                </button>
                                <span className="text-sm font-medium text-[var(--text)] cursor-pointer select-none" onClick={() => setPropertyDifferent(!propertyDifferent)}>
                                    Service/Property Address is different from Billing Address
                                </span>
                            </div>

                            {propertyDifferent && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Service/Property Address <span className="text-blue-500">*</span></label>
                                    <textarea 
                                        value={clientPropertyAddress} 
                                        onChange={(e) => setClientPropertyAddress(e.target.value)}
                                        placeholder="456 Real Estate Blvd&#10;Los Angeles, CA 90001"
                                        rows={2}
                                        className="w-full bg-blue-500/5 border border-blue-500/20 text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                    />
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* STEP 2: INVOICE DETAILS */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text)]">Invoice Details</h2>
                            <p className="text-sm text-[var(--muted)] mt-1">Provide project specifics and timelines.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Invoice Title <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Web Design & Development"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium"
                                    autoFocus
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Description (Optional)</label>
                                <textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Details regarding the scope of work..."
                                    rows={3}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Issue Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    value={issueDate} 
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Due Date (Optional)</label>
                                <input 
                                    type="date" 
                                    value={dueDate} 
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: LINE ITEMS */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text)]">Line Items</h2>
                                <p className="text-sm text-[var(--muted)] mt-1">Add your services or products.</p>
                            </div>
                            <div className="text-xl font-bold text-blue-500 tabular-nums bg-blue-500/10 px-4 py-1.5 rounded-lg border border-blue-500/20">
                                ${subtotal.toFixed(2)}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="relative bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 group">
                                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-xs font-bold shadow-sm">
                                        {index + 1}
                                    </div>
                                    {items.length > 1 && (
                                        <button 
                                            onClick={() => removeItem(item.id)}
                                            className="absolute top-4 right-4 text-red-500/40 hover:text-red-500 transition-colors p-1"
                                            title="Remove Item"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                        <div className="sm:col-span-12">
                                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Item Name</label>
                                            <div className="relative" ref={wrapperRef}>
                                                <input 
                                                    type="text" 
                                                    value={item.name} 
                                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                    onKeyDown={e => handleKeyDown(e, item.id)}
                                                    placeholder="e.g. Server Hosting (1 Year)"
                                                    className="w-full bg-transparent border-b border-[var(--border)] focus:border-blue-500 text-[var(--text)] px-1 py-2 outline-none transition-colors font-semibold"
                                                    autoFocus={index === items.length - 1}
                                                />
                                                {isPro && activeInputId === item.id && suggestions.length > 0 && (
                                                    <ul className="absolute z-[110] w-full bg-[var(--card)] border border-[var(--border)] mt-2 rounded-lg shadow-xl overflow-y-auto py-1 max-h-48 text-left">
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
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Qty</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={item.quantity === 0 ? '' : item.quantity} 
                                                onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                className="w-full bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 tabular-nums"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Unit Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice === 0 ? '' : item.unitPrice} 
                                                    onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-lg pl-7 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-5 flex flex-col justify-end">
                                            <div className="text-right pb-2">
                                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mr-2">Line Total:</span>
                                                <span className="text-[var(--text)] font-semibold tabular-nums">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={addItem}
                                className="w-full py-4 border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] hover:border-blue-500/30 rounded-2xl transition-all font-semibold flex items-center justify-center gap-2 text-sm group"
                            >
                                <div className="w-6 h-6 rounded-full bg-[var(--border)] group-hover:bg-blue-500/20 text-[var(--text)] group-hover:text-blue-500 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                </div>
                                Add Another Item
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: REVIEW & FINALIZE */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="text-center sm:text-left">
                            <h2 className="text-xl font-bold text-[var(--text)]">Review Invoice</h2>
                            <p className="text-sm text-[var(--muted)] mt-1">Finalize amounts and save your document.</p>
                        </div>

                        {/* Visual Live Preview Card */}
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 sm:p-8 shadow-inner relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5 4.5 4.5H13V3.5zM18 20H6V4h6v5a1 1 0 0 0 1 1h5v10z"/></svg>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[var(--border)] pb-6 mb-6">
                                <div>
                                    {/* Sender Info / Business Profile */}
                                    {(businessLogoPath || businessName) && (
                                        <div className="flex items-center gap-3 mb-6">
                                            {businessLogoPath && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={businessLogoPath} alt="Business Logo" className="h-10 w-auto object-contain rounded-lg ring-1 ring-black/5 dark:ring-white/10 p-1 bg-white dark:bg-black/20" />
                                            )}
                                            {businessName && (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-extrabold text-[var(--text)] tracking-tight leading-none">{businessName}</span>
                                                    {businessRegistrationNumber && (
                                                        <span className="text-[11px] text-[var(--muted)] font-medium mt-1">Reg/EIN no: {businessRegistrationNumber}</span>
                                                    )}
                                                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mt-1">Invoice Sender</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Billed To</h3>
                                    {clientCompany && <p className="text-lg font-bold text-[var(--text)] leading-tight">{clientCompany}</p>}
                                    <p className={clsx("font-bold text-[var(--text)]", clientCompany ? "text-sm text-[var(--muted)] font-medium mt-0.5" : "text-lg")}>{clientName}</p>
                                    
                                    {(clientEmail || clientPhone) && (
                                        <div className="mt-1 space-y-0.5">
                                            {clientEmail && <p className="text-sm text-[var(--muted)]">{clientEmail}</p>}
                                            {clientPhone && <p className="text-sm text-[var(--muted)]">{clientPhone}</p>}
                                        </div>
                                    )}

                                    {clientAddress && <pre className="text-sm text-[var(--muted)] font-sans mt-2 whitespace-pre-wrap leading-relaxed">{clientAddress}</pre>}
                                    
                                    {propertyDifferent && clientPropertyAddress && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
                                            <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Service Address</h4>
                                            <pre className="text-sm text-[var(--muted)] font-sans whitespace-pre-wrap leading-relaxed">{clientPropertyAddress}</pre>
                                        </div>
                                    )}
                                </div>
                                <div className="sm:text-right">
                                    <p className="text-xl font-bold text-[var(--text)]">{title}</p>
                                    <p className="text-sm text-[var(--muted)] mt-1">Issue: {issueDate ? format(new Date(issueDate), 'MMM d, yyyy') : 'N/A'}</p>
                                    {dueDate && <p className="text-sm text-red-400 font-medium">Due: {format(new Date(dueDate), 'MMM d, yyyy')}</p>}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[var(--muted)]">{item.quantity}x</span>
                                            <span className="font-medium text-[var(--text)]">{item.name}</span>
                                        </div>
                                        <span className="text-[var(--text)] tabular-nums">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-[var(--border)] pt-5 space-y-3">
                                <div className="flex justify-between text-sm text-[var(--muted)]">
                                    <span>Subtotal</span>
                                    <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider">Discount</span>
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as any)}
                                            className="bg-[var(--card)] border border-[var(--border)] rounded px-1.5 py-1 text-xs outline-none text-[var(--text)]"
                                        >
                                            <option value="none">None</option>
                                            <option value="percent">%</option>
                                            <option value="flat">$ Flat</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 max-w-[120px]">
                                        {discountType !== 'none' && (
                                            <>
                                                {discountType === 'flat' && <span className="text-[var(--muted)]">$</span>}
                                                {discountType === 'percent' && <span className="text-[var(--muted)]">%</span>}
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={discountValue === 0 ? '' : discountValue}
                                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 outline-none text-right tabular-nums focus:border-blue-500 transition-colors"
                                                    placeholder="0.00"
                                                />
                                            </>
                                        )}
                                        <span className="text-red-400 font-medium tabular-nums w-16 text-right">
                                            -{calculatedDiscount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--muted)]">Calculated Tax</span>
                                    <div className="flex items-center gap-2 max-w-[120px]">
                                        <span className="text-[var(--muted)]">$</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={tax === 0 ? '' : tax}
                                            onChange={(e) => setTax(Number(e.target.value))}
                                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 outline-none text-right tabular-nums focus:border-blue-500 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end pt-3 text-[var(--text)] border-t border-[var(--border)]">
                                    <span className="font-bold uppercase tracking-wider text-xs">Total Amount</span>
                                    <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight">${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Internal Notes (Optional)</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any private remarks for this invoice..."
                                rows={2}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none text-sm"
                            />
                        </div>

                        {/* Attachments Section */}
                        <div className="pt-2">
                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Attachments (Photos Only)</label>
                            <label className="flex items-center justify-center w-full min-h-[80px] border-2 border-dashed border-[var(--border)] rounded-2xl cursor-pointer hover:bg-[var(--card)] hover:border-blue-500/50 transition-all text-center p-6 group">
                                <span className="text-sm font-semibold text-[var(--muted)] group-hover:text-blue-500 transition-colors">
                                    Click here to upload photos
                                </span>
                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                            
                            {attachedPhotos.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                                    {attachedPhotos.map((photo, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden shadow-sm border border-[var(--border)] aspect-square bg-[var(--card)]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo} alt="Attachment" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setAttachedPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Sticky Bottom UI Actions Container */}
            <div className="fixed bottom-0 left-0 w-full sm:absolute sm:bottom-auto sm:-bottom-24 bg-[var(--bg)]/90 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t border-[var(--border)] sm:border-none p-4 sm:p-0 z-50 flex flex-col-reverse sm:flex-row justify-between gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none animate-in slide-in-from-bottom-6">
                
                {/* Back Button */}
                <button 
                    onClick={handleBack}
                    disabled={step === 1 || isSaving}
                    className={clsx(
                        "w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold transition-all duration-200 text-sm",
                        step === 1 ? "opacity-0 pointer-events-none" : "bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)]"
                    )}
                >
                    Back
                </button>

                {/* Next / Submit Actions */}
                <div className="flex gap-3 w-full sm:w-auto">
                    {step < 4 ? (
                        <button 
                            onClick={handleNext}
                            className="flex-1 sm:flex-none px-10 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 text-sm flex items-center justify-center gap-2"
                        >
                            Next Step
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={() => handleSubmit('DRAFT')}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none px-6 py-3.5 bg-[var(--card)] border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)] rounded-xl font-bold transition-all text-sm"
                            >
                                {isSaving ? "Saving..." : "Save Draft"}
                            </button>
                            
                            <button 
                                onClick={() => handleSubmit('SENT')}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {isSaving ? "Finalizing..." : isEdit ? "Update Invoice" : "Create Invoice"}
                            </button>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}

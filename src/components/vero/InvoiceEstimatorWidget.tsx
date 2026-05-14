"use client";

import React, { useState } from 'react';

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
}

export default function InvoiceEstimatorWidget({ onClose }: { onClose: () => void }) {
    const [clientName, setClientName] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, price: 0 }
    ]);
    
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [discountValue, setDiscountValue] = useState<number>(0);
    
    const [taxPercent, setTaxPercent] = useState<number>(0);
    
    const [depositType, setDepositType] = useState<'percent' | 'fixed'>('percent');
    const [depositValue, setDepositValue] = useState<number>(0);
    
    const [notes, setNotes] = useState('');

    // Calculations
    const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * (item.price || 0)), 0);
    const discountAmount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (taxPercent / 100);
    const estimatedTotal = taxableAmount + taxAmount;
    const depositAmount = depositType === 'percent' ? estimatedTotal * (depositValue / 100) : depositValue;
    const remainingBalance = estimatedTotal - depositAmount;

    // Formatting helper
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const handleAddLineItem = () => {
        setLineItems([...lineItems, { id: Math.random().toString(), description: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id));
        }
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                // Prevent negative numbers for qty and price
                if ((field === 'quantity' || field === 'price') && Number(value) < 0) {
                    return item;
                }
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* Header Information */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Client Name (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Acme Corp"
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Project / Service Title</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Website Redesign"
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            value={projectTitle}
                            onChange={e => setProjectTitle(e.target.value)}
                        />
                    </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Line Items */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Line Items</label>
                        <button 
                            onClick={handleAddLineItem}
                            className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {lineItems.map((item, index) => (
                            <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-sm relative group">
                                {lineItems.length > 1 && (
                                    <button 
                                        onClick={() => handleRemoveLineItem(item.id)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                                
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-12 sm:col-span-6">
                                        <input 
                                            type="text" 
                                            placeholder="Description"
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                            value={item.description}
                                            onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                                            <span className="px-2 text-xs text-[var(--muted)]">Qty</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
                                                value={item.quantity || ''}
                                                onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                                            <span className="px-2 text-xs text-[var(--muted)]">$</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
                                                value={item.price || ''}
                                                onChange={e => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Adjustments: Discount, Tax, Deposit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Discount */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Discount</label>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50">
                            <select 
                                className="bg-[var(--bg)] border-r border-[var(--border)] px-2 py-2 text-xs text-[var(--text)] focus:outline-none"
                                value={discountType}
                                onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                            >
                                <option value="percent">%</option>
                                <option value="fixed">$</option>
                            </select>
                            <input 
                                type="number" 
                                min="0"
                                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                                value={discountValue || ''}
                                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Tax */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Tax</label>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50">
                            <input 
                                type="number" 
                                min="0"
                                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                                value={taxPercent || ''}
                                onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                            />
                            <span className="bg-[var(--bg)] border-l border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] flex items-center">%</span>
                        </div>
                    </div>

                    {/* Deposit */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Deposit</label>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50">
                            <select 
                                className="bg-[var(--bg)] border-r border-[var(--border)] px-2 py-2 text-xs text-[var(--text)] focus:outline-none"
                                value={depositType}
                                onChange={e => setDepositType(e.target.value as 'percent' | 'fixed')}
                            >
                                <option value="percent">%</option>
                                <option value="fixed">$</option>
                            </select>
                            <input 
                                type="number" 
                                min="0"
                                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                                value={depositValue || ''}
                                onChange={e => setDepositValue(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Notes (Optional)</label>
                    <textarea 
                        rows={2}
                        placeholder="Additional details..."
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    ></textarea>
                </div>

                {/* Safe disclaimer */}
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                        Estimates are for planning purposes and should be reviewed before sending to a client. This tool does not create real invoice records.
                    </p>
                </div>

            </div>

            {/* Estimate Summary Footer */}
            <div className="bg-[var(--card)] border-t border-[var(--border)] p-4 sm:p-5 shrink-0 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-emerald-500">
                            <span>Discount</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-xs text-[var(--muted)]">
                            <span>Estimated Tax ({taxPercent}%)</span>
                            <span>{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-[var(--text)] pt-2 border-t border-[var(--border)] mt-2">
                        <span>Estimated Total</span>
                        <span>{formatCurrency(estimatedTotal)}</span>
                    </div>
                    {depositAmount > 0 && (
                        <>
                            <div className="flex justify-between text-xs text-amber-500 pt-1">
                                <span>Deposit Required</span>
                                <span>{formatCurrency(depositAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-[var(--text)]">
                                <span>Remaining Balance</span>
                                <span>{formatCurrency(remainingBalance)}</span>
                            </div>
                        </>
                    )}
                </div>

                <button 
                    disabled
                    className="w-full bg-blue-500 opacity-50 cursor-not-allowed text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Create real invoice (Coming Soon)
                </button>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from 'react';

export default function TaxEstimatorWidget({ onClose }: { onClose: () => void }) {
    const [income, setIncome] = useState<number>(0);
    const [expenses, setExpenses] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [salesTax, setSalesTax] = useState<number>(0);
    const [selfEmploymentTax, setSelfEmploymentTax] = useState<number>(0);
    const [notes, setNotes] = useState('');

    // Calculations
    const taxableIncome = Math.max(0, (income || 0) - (expenses || 0));
    const estimatedIncomeTax = taxableIncome * (Math.min(100, taxRate || 0) / 100);
    const selfEmploymentTaxAmount = taxableIncome * (Math.min(100, selfEmploymentTax || 0) / 100);
    const totalSetAside = estimatedIncomeTax + (salesTax || 0) + selfEmploymentTaxAmount;

    // Formatting helper
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* Core Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Gross Income / Revenue</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                            <input 
                                type="number" 
                                min="0"
                                placeholder="0.00"
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                value={income || ''}
                                onChange={e => setIncome(Math.max(0, parseFloat(e.target.value) || 0))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Business Expenses</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                            <input 
                                type="number" 
                                min="0"
                                placeholder="0.00"
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                value={expenses || ''}
                                onChange={e => setExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Tax Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Income Tax Rate */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Estimated Tax Rate</label>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50">
                            <input 
                                type="number" 
                                min="0"
                                max="100"
                                className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none"
                                value={taxRate || ''}
                                onChange={e => setTaxRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            />
                            <span className="bg-[var(--bg)] border-l border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)] flex items-center">%</span>
                        </div>
                    </div>

                    {/* Sales Tax Collected */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider text-ellipsis whitespace-nowrap overflow-hidden">Sales Tax Collected</label>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50">
                            <span className="bg-[var(--bg)] border-r border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)] flex items-center">$</span>
                            <input 
                                type="number" 
                                min="0"
                                className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none"
                                value={salesTax || ''}
                                onChange={e => setSalesTax(Math.max(0, parseFloat(e.target.value) || 0))}
                            />
                        </div>
                    </div>

                    {/* Self Employment Tax */}
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                            Self-Employment Tax
                            <span className="bg-[var(--bg)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[9px] text-[var(--muted)]">Optional</span>
                        </label>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50">
                            <input 
                                type="number" 
                                min="0"
                                max="100"
                                placeholder="e.g. 15.3"
                                className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none"
                                value={selfEmploymentTax || ''}
                                onChange={e => setSelfEmploymentTax(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            />
                            <span className="bg-[var(--bg)] border-l border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)] flex items-center">%</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Notes (Optional)</label>
                    <textarea 
                        rows={2}
                        placeholder="Additional details..."
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    ></textarea>
                </div>

                {/* Safe disclaimers */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="text-[11px] text-[var(--muted)] leading-relaxed space-y-1">
                        <p>This is an estimate only.</p>
                        <p>This tool is for planning purposes and does not replace a tax professional.</p>
                        <p>Review your local, state, and federal tax requirements before making decisions.</p>
                    </div>
                </div>

            </div>

            {/* Estimate Summary Footer */}
            <div className="bg-[var(--card)] border-t border-[var(--border)] p-4 sm:p-5 shrink-0 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="space-y-1.5 mb-2">
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                        <span>Gross Income</span>
                        <span>{formatCurrency(income || 0)}</span>
                    </div>
                    {expenses > 0 && (
                        <div className="flex justify-between text-xs text-[var(--muted)]">
                            <span>Business Expenses</span>
                            <span>-{formatCurrency(expenses)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs font-semibold text-[var(--text)] pt-1">
                        <span>Estimated Taxable Income</span>
                        <span>{formatCurrency(taxableIncome)}</span>
                    </div>

                    <div className="pt-2 border-t border-[var(--border)] mt-2"></div>

                    {estimatedIncomeTax > 0 && (
                        <div className="flex justify-between text-xs text-[var(--muted)]">
                            <span>Estimated Income Tax ({taxRate || 0}%)</span>
                            <span>{formatCurrency(estimatedIncomeTax)}</span>
                        </div>
                    )}
                    {salesTax > 0 && (
                        <div className="flex justify-between text-xs text-[var(--muted)]">
                            <span>Sales Tax Collected</span>
                            <span>{formatCurrency(salesTax)}</span>
                        </div>
                    )}
                    {selfEmploymentTaxAmount > 0 && (
                        <div className="flex justify-between text-xs text-[var(--muted)]">
                            <span>Self-Employment Tax ({selfEmploymentTax || 0}%)</span>
                            <span>{formatCurrency(selfEmploymentTaxAmount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-[var(--border)] mt-2">
                        <span>Suggested Tax Set-Aside</span>
                        <span>{formatCurrency(totalSetAside)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

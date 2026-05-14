"use client";

import React, { useState } from 'react';

export default function ProfitMarginWidget({ onClose }: { onClose: () => void }) {
    const [salePrice, setSalePrice] = useState<number>(0);
    const [cost, setCost] = useState<number>(0);
    const [expenses, setExpenses] = useState<number>(0);
    const [targetMargin, setTargetMargin] = useState<number>(0);
    const [targetProfit, setTargetProfit] = useState<number>(0);

    // Calculations
    const totalCost = (cost || 0) + (expenses || 0);
    const grossProfit = (salePrice || 0) - totalCost;
    
    // Prevent divide by zero
    const profitMargin = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
    const markup = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
    
    const breakEvenPrice = totalCost;
    
    // Prevent divide by zero or infinite loop if target margin is 100% or greater
    const validTargetMargin = Math.min(99.99, targetMargin || 0);
    const targetMarginSalePrice = validTargetMargin > 0 ? totalCost / (1 - (validTargetMargin / 100)) : 0;
    
    const targetProfitSalePrice = totalCost + (targetProfit || 0);

    // Formatting helper
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatPercent = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val / 100);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* Core Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Sale Price / Revenue</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                            <input 
                                type="number" 
                                min="0"
                                placeholder="0.00"
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                value={salePrice || ''}
                                onChange={e => setSalePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider text-ellipsis whitespace-nowrap overflow-hidden">Cost of Goods</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="0.00"
                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    value={cost || ''}
                                    onChange={e => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider text-ellipsis whitespace-nowrap overflow-hidden">Overhead / Exp.</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="0.00"
                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    value={expenses || ''}
                                    onChange={e => setExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Target Planning */}
                <div className="space-y-4">
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Goal Pricing (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Target Margin */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-[var(--muted)] tracking-wide">Target Margin %</label>
                            <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/50">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="99.99"
                                    placeholder="e.g. 40"
                                    className="w-full bg-transparent px-4 py-2 text-sm focus:outline-none"
                                    value={targetMargin || ''}
                                    onChange={e => setTargetMargin(Math.min(99.99, Math.max(0, parseFloat(e.target.value) || 0)))}
                                />
                                <span className="bg-[var(--bg)] border-l border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)] flex items-center">%</span>
                            </div>
                        </div>

                        {/* Target Profit */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-[var(--muted)] tracking-wide">Target Profit $</label>
                            <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/50">
                                <span className="bg-[var(--bg)] border-r border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)] flex items-center">$</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="e.g. 25"
                                    className="w-full bg-transparent px-4 py-2 text-sm focus:outline-none"
                                    value={targetProfit || ''}
                                    onChange={e => setTargetProfit(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Safe disclaimers */}
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="text-[11px] text-[var(--muted)] leading-relaxed space-y-1">
                        <p>Estimates are for planning purposes only.</p>
                        <p>This tool does not replace accounting or financial advice.</p>
                    </div>
                </div>

            </div>

            {/* Result Summary Footer */}
            <div className="bg-[var(--card)] border-t border-[var(--border)] p-4 sm:p-5 shrink-0 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Status</span>
                    {grossProfit > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Profitable
                        </span>
                    ) : grossProfit === 0 && salePrice > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Break-even
                        </span>
                    ) : salePrice > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Below Cost
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">
                            Awaiting Data
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                        <span className="block text-xs text-[var(--muted)]">Total Cost</span>
                        <span className="block text-sm font-medium text-[var(--text)]">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="block text-xs text-[var(--muted)]">Gross Profit</span>
                        <span className={`block text-sm font-semibold ${grossProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : grossProfit < 0 ? 'text-red-500' : 'text-[var(--text)]'}`}>
                            {formatCurrency(grossProfit)}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="block text-xs text-[var(--muted)]">Profit Margin</span>
                        <span className="block text-sm font-medium text-[var(--text)]">{formatPercent(profitMargin)}</span>
                    </div>
                    <div className="space-y-1">
                        <span className="block text-xs text-[var(--muted)]">Markup</span>
                        <span className="block text-sm font-medium text-[var(--text)]">{formatPercent(markup)}</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--muted)]">Break-Even Price</span>
                        <span className="font-medium text-[var(--text)]">{formatCurrency(breakEvenPrice)}</span>
                    </div>
                    
                    {targetMargin > 0 && (
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-purple-600 dark:text-purple-400">Price for {targetMargin}% Margin</span>
                            <span className="font-semibold text-[var(--text)]">{formatCurrency(targetMarginSalePrice)}</span>
                        </div>
                    )}
                    
                    {targetProfit > 0 && (
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-purple-600 dark:text-purple-400">Price for {formatCurrency(targetProfit)} Profit</span>
                            <span className="font-semibold text-[var(--text)]">{formatCurrency(targetProfitSalePrice)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from 'react';
import BasicCalculator from './BasicCalculator';
import { clsx } from 'clsx';

type TabMode = 'standard' | 'tax' | 'discount' | 'margin';

export default function BusinessCalculator() {
    const [activeTab, setActiveTab] = useState<TabMode>('standard');

    // Tax State
    const [taxSubtotal, setTaxSubtotal] = useState('');
    const [taxRate, setTaxRate] = useState('');

    // Discount State
    const [discOriginal, setDiscOriginal] = useState('');
    const [discPercent, setDiscPercent] = useState('');

    // Margin State
    const [marginCost, setMarginCost] = useState('');
    const [marginPrice, setMarginPrice] = useState('');

    const renderTabs = () => (
        <div className="flex p-2 bg-[var(--card)] border-b border-[var(--border)] overflow-x-auto hide-scrollbar">
            <div className="flex space-x-1 min-w-max mx-auto">
                {[
                    { id: 'standard', label: 'Standard' },
                    { id: 'tax', label: 'Sales Tax' },
                    { id: 'discount', label: 'Discount' },
                    { id: 'margin', label: 'Margin' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabMode)}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                            activeTab === tab.id 
                                ? "bg-amber-500 text-amber-950 shadow-sm" 
                                : "text-[var(--text)] opacity-70 hover:opacity-100 hover:bg-[var(--card-hover)]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const safeNum = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const renderFormInput = (label: string, value: string, setter: (val: string) => void, placeholder: string = '0.00', isPercent = false) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">{label}</label>
            <div className="relative">
                {!isPercent && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>}
                <input 
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-3 px-4 text-[var(--text)] text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow",
                        !isPercent ? "pl-8" : "pr-8"
                    )}
                />
                {isPercent && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">%</span>}
            </div>
        </div>
    );

    const renderResultRow = (label: string, value: number, highlight = false) => (
        <div className={clsx(
            "flex justify-between items-center py-3 border-b border-[var(--border)] last:border-0",
            highlight && "text-amber-500 font-semibold text-lg"
        )}>
            <span className={clsx(highlight ? "text-[var(--text)]" : "text-[var(--muted)]")}>{label}</span>
            <span>{formatCurrency(value)}</span>
        </div>
    );

    const renderTaxTab = () => {
        const sub = safeNum(taxSubtotal);
        const rate = safeNum(taxRate);
        const calculatedTax = sub * (rate / 100);
        const total = sub + calculatedTax;

        return (
            <div className="p-6 flex flex-col h-full overflow-y-auto">
                <div className="flex-1">
                    {renderFormInput("Subtotal", taxSubtotal, setTaxSubtotal)}
                    {renderFormInput("Tax Rate", taxRate, setTaxRate, "0", true)}
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mt-6 shadow-inner">
                    {renderResultRow("Subtotal", sub)}
                    {renderResultRow("Calculated Tax", calculatedTax)}
                    <div className="h-px bg-[var(--border)] my-2" />
                    {renderResultRow("Final Total", total, true)}
                </div>
            </div>
        );
    };

    const renderDiscountTab = () => {
        const orig = safeNum(discOriginal);
        const pct = safeNum(discPercent);
        const amt = orig * (pct / 100);
        const final = Math.max(0, orig - amt);

        return (
            <div className="p-6 flex flex-col h-full overflow-y-auto">
                <div className="flex-1">
                    {renderFormInput("Original Price", discOriginal, setDiscOriginal)}
                    {renderFormInput("Discount Percent", discPercent, setDiscPercent, "0", true)}
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mt-6 shadow-inner">
                    {renderResultRow("Original Price", orig)}
                    {renderResultRow("Amount Saved", amt)}
                    <div className="h-px bg-[var(--border)] my-2" />
                    {renderResultRow("Final Price", final, true)}
                </div>
            </div>
        );
    };

    const renderMarginTab = () => {
        const cost = safeNum(marginCost);
        const price = safeNum(marginPrice);
        const profit = price - cost;
        const marginPct = price > 0 ? (profit / price) * 100 : 0;

        return (
            <div className="p-6 flex flex-col h-full overflow-y-auto">
                <div className="flex-1">
                    {renderFormInput("Cost to Produce", marginCost, setMarginCost)}
                    {renderFormInput("Sale Price", marginPrice, setMarginPrice)}
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mt-6 shadow-inner">
                    {renderResultRow("Gross Profit", profit)}
                    <div className="flex justify-between items-center py-3 text-amber-500 font-semibold text-lg">
                        <span className="text-[var(--text)]">Profit Margin</span>
                        <span>{marginPct.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">
            {renderTabs()}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'standard' && <BasicCalculator />}
                {activeTab === 'tax' && renderTaxTab()}
                {activeTab === 'discount' && renderDiscountTab()}
                {activeTab === 'margin' && renderMarginTab()}
            </div>
        </div>
    );
}

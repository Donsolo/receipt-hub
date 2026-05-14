"use client";

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import BasicCalculator from './BasicCalculator';
import BusinessCalculator from './BusinessCalculator';
import InvoiceEstimatorWidget from './InvoiceEstimatorWidget';
import TaxEstimatorWidget from './TaxEstimatorWidget';
import ProfitMarginWidget from './ProfitMarginWidget';

interface CalculatorWidgetProps {
    type: 'basic' | 'business' | 'estimator' | 'tax' | 'margin';
    onClose: () => void;
}

export default function CalculatorWidget({ type, onClose }: CalculatorWidgetProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Trigger mount animation
    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for transition
    };

    return (
        <>
            {/* Backdrop overlay */}
            <div 
                className={clsx(
                    "fixed inset-0 z-[50] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={handleClose}
            />

            <div 
                className={clsx(
                    "fixed z-[60] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    "bottom-[100px] left-4 right-4 sm:right-auto sm:left-8 sm:bottom-8 sm:w-[380px] h-[75vh] sm:h-[600px] max-h-[600px]",
                    "bg-[var(--bg)] border border-[var(--border)] shadow-2xl rounded-3xl overflow-hidden flex flex-col",
                    isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95 pointer-events-none"
                )}
            style={{
                boxShadow: (type === 'business' || type === 'estimator' || type === 'margin')
                    ? type === 'estimator' 
                        ? '0 25px 50px -12px rgba(59, 130, 246, 0.15), 0 0 0 1px var(--border)' // blue for estimator
                        : type === 'margin'
                            ? '0 25px 50px -12px rgba(168, 85, 247, 0.15), 0 0 0 1px var(--border)' // purple for margin
                            : '0 25px 50px -12px rgba(245, 158, 11, 0.15), 0 0 0 1px var(--border)' 
                    : type === 'tax'
                        ? '0 25px 50px -12px rgba(16, 185, 129, 0.15), 0 0 0 1px var(--border)' // emerald for tax
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border)'
            }}
        >
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--card)] border-b border-[var(--border)] shrink-0 select-none">
                <div className="flex items-center space-x-2">
                    {(type === 'business' || type === 'estimator' || type === 'margin') ? (
                        <span className={clsx(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border",
                            type === 'estimator' 
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : type === 'margin'
                                    ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                            Vero+
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20 uppercase tracking-wide">
                            Core
                        </span>
                    )}
                    <h3 className="text-sm font-semibold text-[var(--text)]">
                        {type === 'business' ? 'Business Calculator' : type === 'estimator' ? 'Invoice Estimator' : type === 'tax' ? 'Tax Estimator' : type === 'margin' ? 'Profit Margin Tool' : 'Basic Calculator'}
                    </h3>
                </div>

                <button 
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-[var(--bg)] flex flex-col">
                {type === 'basic' && <BasicCalculator />}
                {type === 'business' && <BusinessCalculator />}
                {type === 'estimator' && <InvoiceEstimatorWidget onClose={handleClose} />}
                {type === 'tax' && <TaxEstimatorWidget onClose={handleClose} />}
                {type === 'margin' && <ProfitMarginWidget onClose={handleClose} />}
            </div>
        </div>
        </>
    );
}

"use client";

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import BasicCalculator from './BasicCalculator';
import BusinessCalculator from './BusinessCalculator';

interface CalculatorWidgetProps {
    type: 'basic' | 'business';
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
        <div 
            className={clsx(
                "fixed z-[60] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "bottom-[100px] left-4 right-4 sm:right-auto sm:left-8 sm:bottom-8 sm:w-[380px] h-[75vh] sm:h-[600px] max-h-[600px]",
                "bg-[var(--bg)] border border-[var(--border)] shadow-2xl rounded-3xl overflow-hidden flex flex-col",
                isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95 pointer-events-none"
            )}
            style={{
                boxShadow: type === 'business' 
                    ? '0 25px 50px -12px rgba(245, 158, 11, 0.15), 0 0 0 1px var(--border)' 
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border)'
            }}
        >
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--card)] border-b border-[var(--border)] shrink-0 select-none">
                <div className="flex items-center space-x-2">
                    {type === 'business' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                            Vero+
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20 uppercase tracking-wide">
                            Core
                        </span>
                    )}
                    <h3 className="text-sm font-semibold text-[var(--text)]">
                        {type === 'business' ? 'Business Calculator' : 'Basic Calculator'}
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
            <div className="flex-1 overflow-hidden relative bg-[var(--bg)]">
                {type === 'basic' ? <BasicCalculator /> : <BusinessCalculator />}
            </div>
        </div>
    );
}

"use client";

import { useState } from 'react';
import VeroAssistant from './VeroAssistant';

export default function GlobalVeroBubble({ isPro }: { isPro: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isPro) return null;

    return (
        <>
            {/* The Floating Bubble (Desktop Only) */}
            <div className="fixed bottom-6 right-6 z-[90] hidden md:flex items-center justify-center">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center ring-4 ring-white/10 dark:ring-[#0B1220]"
                    aria-label="Open Vero Assistant"
                >
                    {isOpen ? (
                        <svg className="w-6 h-6 animate-in fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-7 h-7 animate-in fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* The Chat Overlay */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[400px] z-[90] hidden md:flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-300">
                    <div className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden relative">
                        <VeroAssistant isOverlay={true} />
                        
                        {/* Close Button on top right of the widget itself, just in case */}
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 w-8 h-8 bg-gray-100/50 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

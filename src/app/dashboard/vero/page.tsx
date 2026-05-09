"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import HeroSection from '@/components/ui/HeroSection';
import CalculatorWidget from '@/components/vero/CalculatorWidget';

export default function VeroSuitePage() {
    const router = useRouter();
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeWidget, setActiveWidget] = useState<'basic' | 'business' | null>(null);

    useEffect(() => {
        const checkPlan = async () => {
            try {
                // First get user profile directly from /api/user/profile to check plan
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    setIsPro(data.plan === 'PRO' && data.planStatus !== 'inactive');
                } else {
                    router.push('/login');
                }
            } catch (err) {
                console.error("Failed to load user plan", err);
            } finally {
                setLoading(false);
            }
        };
        checkPlan();
    }, [router]);

    if (loading) {
        return (
            <div className="p-8 text-[var(--muted)] min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 mb-4 flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <span>Loading Vero Suite...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] relative pb-24 md:pb-8 overflow-x-hidden">
            <HeroSection pageKey="vero" />

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-7xl space-y-8 relative">
                    <PageHeaderCard 
                        title={isPro ? "Vero Suite+" : "Vero Suite"} 
                        description="Smart tools for receipts, invoices, and business decisions." 
                    />

                    {/* Tools Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* 1. Basic Calculator (CORE ONLY) */}
                        {!isPro && (
                            <div className="bg-[var(--bg)]/50 border border-[var(--border)] rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                        Core
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Basic Calculator</h3>
                                <p className="text-sm text-[var(--muted)] mb-6 flex-1">Quick math and percentage calculations for your everyday receipt needs.</p>
                                <button 
                                    onClick={() => setActiveWidget('basic')}
                                    className="w-full bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                                >
                                    Open Tool
                                </button>
                            </div>
                        )}

                        {/* 2. Business Calculator (PRO ONLY) */}
                        {isPro && (
                            <div className="bg-gradient-to-b from-[var(--card)] to-[var(--bg)] border border-[var(--border)] rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                        </svg>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        Vero+
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Business Calculator</h3>
                                <p className="text-sm text-[var(--muted)] mb-6 flex-1">Advanced metrics, ROI projections, and bulk percentage tracking.</p>
                                
                                <button 
                                    onClick={() => setActiveWidget('business')}
                                    className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                                >
                                    Open Tool
                                </button>
                            </div>
                        )}

                        {/* 3. Invoice Estimator */}
                        <div className="bg-[var(--bg)]/50 border border-[var(--border)] rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                    Core
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Invoice Estimator</h3>
                            <p className="text-sm text-[var(--muted)] mb-6 flex-1">Draft up rough job estimates before generating a formal invoice.</p>
                            <button className="w-full bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)] text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                Open Tool
                            </button>
                        </div>

                        {/* 4. Tax Estimator (PRO) */}
                        <div className="bg-gradient-to-b from-[var(--card)] to-[var(--bg)] border border-[var(--border)] rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Vero+
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Tax Estimator</h3>
                            <p className="text-sm text-[var(--muted)] mb-6 flex-1">Calculate estimated quarterly taxes based on your invoiced revenue.</p>
                            
                            {isPro ? (
                                <button className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                    Open Tool
                                </button>
                            ) : (
                                <Link href="/billing" className="w-full text-center bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm inline-block">
                                    Unlock with Pro
                                </Link>
                            )}
                        </div>

                        {/* 5. Profit Margin Tool (PRO) */}
                        <div className="bg-gradient-to-b from-[var(--card)] to-[var(--bg)] border border-[var(--border)] rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                    </svg>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Vero+
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Profit Margin Tool</h3>
                            <p className="text-sm text-[var(--muted)] mb-6 flex-1">Analyze expenses vs revenue to determine true profit margins instantly.</p>
                            
                            {isPro ? (
                                <button className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                    Open Tool
                                </button>
                            ) : (
                                <Link href="/billing" className="w-full text-center bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm inline-block">
                                    Unlock with Pro
                                </Link>
                            )}
                        </div>

                        {/* 6. AI Business Assistant (COMING SOON) */}
                        <div className="bg-gradient-to-b from-indigo-900/10 to-[var(--bg)] border border-indigo-500/20 rounded-xl p-6 flex flex-col shadow-lg shadow-indigo-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Coming Soon
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-2 relative z-10">AI Business Assistant</h3>
                            <p className="text-sm text-[var(--muted)] mb-6 flex-1 relative z-10">Ask Vero questions about your revenue, spending trends, and client history using natural language.</p>
                            
                            <button disabled className="w-full bg-gray-500/10 text-gray-500 border border-gray-500/20 text-sm font-medium px-4 py-2 rounded-lg cursor-not-allowed relative z-10">
                                In Development
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Floating Widget Container */}
            {activeWidget && (
                <CalculatorWidget 
                    type={activeWidget} 
                    onClose={() => setActiveWidget(null)} 
                />
            )}
        </div>
    );
}

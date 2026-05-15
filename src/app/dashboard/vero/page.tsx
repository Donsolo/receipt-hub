"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import HeroSection from '@/components/ui/HeroSection';
import CalculatorWidget from '@/components/vero/CalculatorWidget';
import VeroAssistant from '@/components/vero/VeroAssistant';
import { usePlatform } from '@/lib/platform';

export default function VeroSuitePage() {
    const router = useRouter();
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeWidget, setActiveWidget] = useState<'basic' | 'business' | 'estimator' | 'tax' | 'margin' | null>(null);
    const [hasActivity, setHasActivity] = useState(false); // Controls dynamic workspace empty states
    const [userName, setUserName] = useState<string | null>(null);
    const [lastUsedTool, setLastUsedTool] = useState<'basic' | 'business' | 'estimator' | 'tax' | 'margin' | null>(null);
    const { isNativeAndroid } = usePlatform();

    useEffect(() => {
        // Load session memory
        const storedTool = localStorage.getItem('vero_last_used_tool') as 'basic' | 'business' | 'estimator' | 'tax' | 'margin' | null;
        if (storedTool) {
            setLastUsedTool(storedTool);
        }

        const checkPlan = async () => {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    const isUserPro = (data.plan === 'PRO' && data.planStatus !== 'inactive') || data.role === 'ADMIN' || data.role === 'SUPER_ADMIN';
                    setIsPro(isUserPro);
                    setHasActivity(false); // Simulated for new user
                    if (data.name) {
                        setUserName(data.name.split(' ')[0]); // Get first name
                    }
                    
                    document.title = isUserPro ? 'Vero Suite+ | Verihub' : 'Vero Suite | Verihub';
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

    const handleOpenTool = (tool: 'basic' | 'business' | 'estimator' | 'tax' | 'margin') => {
        setActiveWidget(tool);
        setLastUsedTool(tool);
        localStorage.setItem('vero_last_used_tool', tool);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

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
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] relative pb-32 md:pb-12 overflow-x-hidden">
            <HeroSection 
                pageKey="vero" 
                imageUrl="/images/vero-hero.jpg"
                overlayOpacity={0.65}
                blurStrength={0}
            />

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-7xl space-y-8 relative">
                    {/* NEW: Personalized Greeting & Workspace Health */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2 px-2">
                        <div className="flex flex-col">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text)] tracking-tight">
                                {getGreeting()}{userName ? `, ${userName}` : ''}
                            </h1>
                            <p className="text-[var(--muted)] text-sm sm:text-base mt-2 max-w-2xl">
                                Welcome to {isPro ? "Vero Suite+" : "Vero Suite"}. Your AI business operating system.
                            </p>
                        </div>
                        
                        {/* Workspace Health Status */}
                        <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 rounded-full shadow-sm w-fit">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                                {hasActivity ? (
                                    <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </>
                                ) : (
                                    <>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                    </>
                                )}
                            </span>
                            <span className="text-xs font-semibold text-[var(--text)]">
                                {hasActivity ? 'Workspace Active' : 'Setup Incomplete'}
                            </span>
                        </div>
                    </div>

                    {/* NEW: Focus Today (Next Best Action Hub) */}
                    <div className="bg-[var(--card)]/80 backdrop-blur-md border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors mx-2 sm:mx-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        
                        <div className="flex items-start sm:items-center gap-4 relative z-10">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 sm:mt-0 ${lastUsedTool === 'business' ? 'bg-amber-500/10 text-amber-500' : lastUsedTool === 'basic' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {lastUsedTool === 'business' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                ) : lastUsedTool === 'basic' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                        Focus Today
                                    </h4>
                                </div>
                                <p className="text-sm font-medium text-[var(--text)]">
                                    {lastUsedTool === 'business' 
                                        ? 'Draft an Invoice Estimate based on your latest margins.' 
                                        : lastUsedTool === 'basic' 
                                            ? 'Scan receipts to track your total expenses.'
                                            : 'Start by scanning a receipt to unlock AI insights.'}
                                </p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => {
                                if (lastUsedTool === 'business') {
                                    handleOpenTool('estimator');
                                } else {
                                    router.push('/dashboard/receipts');
                                }
                            }}
                            className="relative z-10 shrink-0 bg-[var(--text)] text-[var(--bg)] hover:opacity-90 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full sm:w-auto shadow-md"
                        >
                            {lastUsedTool === 'business' ? 'Create Estimate' : lastUsedTool === 'basic' ? 'Scan Receipt' : 'Start Scanning'}
                        </button>
                    </div>


                    {/* Horizontal Tools Carousel */}
                    <div className="relative w-full -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mt-4">
                        <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-8 custom-scrollbar">
                            
                            {/* 1. Basic Calculator (CORE ONLY) */}
                            {!isPro && (
                                <div onClick={() => handleOpenTool('basic')} className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-start bg-[var(--bg)]/50 border border-[var(--border)] rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-all hover:-translate-y-1 focus-within:ring-2 focus-within:ring-indigo-500 relative overflow-hidden group cursor-pointer">
                                    <div className="flex-1 p-6 flex flex-col relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
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
                                    </div>
                                    <div className="p-4 bg-[var(--card)] border-t border-[var(--border)] shrink-0 z-10">
                                        <button 
                                            onClick={() => handleOpenTool('basic')}
                                            className="w-full bg-[var(--bg)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)] text-sm font-medium px-4 py-2.5 rounded-xl transition-colors outline-none"
                                        >
                                            Open Tool
                                        </button>
                                    </div>
                                    {/* Subtle gradient background for empty state */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/5 pointer-events-none"></div>
                                </div>
                            )}

                            {/* 2. Business Calculator (PRO ONLY) */}
                            {isPro && (
                                <div onClick={() => handleOpenTool('business')} className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-start bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-all hover:-translate-y-1 focus-within:ring-2 focus-within:ring-amber-500 relative overflow-hidden group cursor-pointer">
                                    <div className="relative flex-1 overflow-hidden bg-[var(--bg)]">
                                        <img src="/images/Vero Cards/Business Calculator.png" alt="Business Calculator" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-4 right-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-sm">
                                                Vero+
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--card)] border-t border-[var(--border)] shrink-0 z-10">
                                        <button 
                                            onClick={() => handleOpenTool('business')}
                                            className="w-full bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors outline-none"
                                        >
                                            Open Tool
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 3. Invoice Estimator (PRO) */}
                            {isPro ? (
                                <div onClick={() => handleOpenTool('estimator')} className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-start bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-all hover:-translate-y-1 focus-within:ring-2 focus-within:ring-blue-500 relative overflow-hidden group cursor-pointer">
                                    <div className="relative flex-1 overflow-hidden bg-[var(--bg)]">
                                        <img src="/images/Vero Cards/Invoice Estimator.png" alt="Invoice Estimator" className="w-full h-full object-cover object-left group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-4 right-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-sm">
                                                Vero+
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--card)] border-t border-[var(--border)] shrink-0 z-10">
                                        <button 
                                            onClick={() => handleOpenTool('estimator')}
                                            className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 dark:text-blue-400 border border-blue-500/20 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors outline-none"
                                        >
                                            Open Tool
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex flex-col relative overflow-hidden group">
                                    <div className="relative flex-1 overflow-hidden opacity-60 grayscale-[50%]">
                                        <img src="/images/Vero Cards/Invoice Estimator.png" alt="Invoice Estimator Locked" className="w-full h-full object-cover object-left" />
                                        <div className="absolute top-4 right-4 z-20">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md border border-white/10">
                                                Vero+ Only
                                            </span>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                                            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-xl">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--bg)]/40 border-t border-[var(--border)] shrink-0 z-10 relative">
                                        {!isNativeAndroid && (
                                            <Link href="/dashboard/billing" className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-600 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors before:absolute before:-inset-y-[300px] before:-inset-x-0">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Upgrade to Unlock
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 4. Tax Estimator (Core/Free) */}
                            <div onClick={() => handleOpenTool('tax')} className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-start bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-all hover:-translate-y-1 focus-within:ring-2 focus-within:ring-emerald-500 relative overflow-hidden group cursor-pointer">
                                <div className="relative flex-1 overflow-hidden bg-[var(--bg)]">
                                    <img src="/images/Vero Cards/Tax Estimator.png" alt="Tax Estimator" className="w-full h-full object-cover object-left group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-4 right-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-sm">
                                            Core
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 bg-[var(--card)] border-t border-[var(--border)] shrink-0 z-10">
                                    <button 
                                        onClick={() => handleOpenTool('tax')}
                                        className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors outline-none"
                                    >
                                        Open Tool
                                    </button>
                                </div>
                            </div>

                            {/* 5. Profit Margin Tool (PRO) */}
                            {isPro ? (
                                <div onClick={() => handleOpenTool('margin')} className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-start bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-all hover:-translate-y-1 focus-within:ring-2 focus-within:ring-purple-500 relative overflow-hidden group cursor-pointer">
                                    <div className="relative flex-1 overflow-hidden bg-[var(--bg)]">
                                        <img src="/images/Vero Cards/Profit Margin Tool.png" alt="Profit Margin Tool" className="w-full h-full object-cover object-left group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-4 right-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-sm">
                                                Vero+
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--card)] border-t border-[var(--border)] shrink-0 z-10">
                                        <button 
                                            onClick={() => handleOpenTool('margin')}
                                            className="w-full bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 dark:text-purple-400 border border-purple-500/20 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors outline-none"
                                        >
                                            Open Tool
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-[280px] sm:w-[320px] h-[360px] shrink-0 snap-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex flex-col relative overflow-hidden group">
                                    <div className="relative flex-1 overflow-hidden opacity-60 grayscale-[50%]">
                                        <img src="/images/Vero Cards/Profit Margin Tool.png" alt="Profit Margin Tool Locked" className="w-full h-full object-cover object-left" />
                                        <div className="absolute top-4 right-4 z-20">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md border border-white/10">
                                                Vero+ Only
                                            </span>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                                            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-xl">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--bg)]/40 border-t border-[var(--border)] shrink-0 z-10 relative">
                                        {!isNativeAndroid && (
                                            <Link href="/dashboard/billing" className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-600 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors before:absolute before:-inset-y-[300px] before:-inset-x-0">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Upgrade to Unlock
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Visual Gradient Fades for Carousel Scroll indication */}
                        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent pointer-events-none hidden md:block"></div>
                        <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-[var(--bg)] to-transparent pointer-events-none hidden md:block"></div>
                    </div>

                    {/* NEW: Ask Vero Image Hero Panel */}
                    <div className="mt-8 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/5 relative group transition-all duration-500 hover:shadow-indigo-500/10 hover:-translate-y-1">
                        <div className="w-full h-[220px] sm:h-[320px] md:h-[400px] relative bg-[var(--card)]">
                            <img 
                                src="/images/Vero Cards/Ask Vero.png" 
                                alt="Ask Vero Assistant" 
                                className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                            />
                            {/* Animated modern overlay effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay"></div>
                            
                            {/* Glassmorphic "Live" indicator to make it feel alive */}
                            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse relative">
                                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                                </span>
                                <span className="text-white text-[10px] sm:text-xs font-semibold tracking-wide uppercase">Vero Online</span>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Vero Recommendations */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between px-2 mb-3">
                            <h3 className="text-lg font-bold text-[var(--text)] tracking-tight">Vero Recommendations</h3>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">Powered by AI</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Recommendation 1 */}
                            <div className="bg-[var(--card)]/80 backdrop-blur-sm border border-indigo-500/10 rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-[var(--text)] mb-0.5">Automated Summaries</h4>
                                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                                        {hasActivity 
                                            ? "Review the latest AI summaries from your recently scanned receipts to spot spending anomalies." 
                                            : "Vero can summarize receipts. Try scanning your first receipt to unlock spending trends."}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Recommendation 2 */}
                            <div className="bg-[var(--card)]/80 backdrop-blur-sm border border-cyan-500/10 rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow hidden md:flex">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-[var(--text)] mb-0.5">Tax Exposure</h4>
                                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                                        {hasActivity
                                            ? "Generate your quarterly estimate now that sufficient invoice data has been gathered."
                                            : "Track your margins. Once you have invoice data, Vero will recommend estimated tax planning."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Activity Summary */}
                    <div className="mt-6 space-y-4">
                        <h3 className="text-lg font-bold text-[var(--text)] px-2 tracking-tight">Activity Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            {/* Receipts Summary */}
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col min-h-[110px] shadow-sm relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
                                <div className="text-sm font-medium text-[var(--muted)] mb-1 flex items-center justify-between">
                                    Receipts
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="text-xs text-[var(--text)] mt-auto relative z-10 font-medium flex flex-col gap-1 leading-relaxed">
                                    {hasActivity ? "You've been actively organizing expenses recently." : "No receipt activity detected yet. Start scanning."}
                                    {hasActivity && <span className="text-[10px] text-indigo-400/80 flex items-center gap-1 cursor-pointer hover:text-indigo-500 transition-colors mt-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>Analyze Expenses</span>}
                                </div>
                                {/* Skeleton chart background */}
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gray-100 dark:from-white/5 to-transparent opacity-50 z-0">
                                    <div className="flex items-end justify-between h-full px-4 pb-2 gap-1 opacity-20">
                                        <div className="w-1/4 h-[30%] bg-gray-400 rounded-t-sm"></div>
                                        <div className="w-1/4 h-[50%] bg-gray-400 rounded-t-sm"></div>
                                        <div className="w-1/4 h-[40%] bg-gray-400 rounded-t-sm"></div>
                                        <div className="w-1/4 h-[70%] bg-gray-400 rounded-t-sm"></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Invoices Summary */}
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col min-h-[110px] shadow-sm relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
                                <div className="text-sm font-medium text-[var(--muted)] mb-1 flex items-center justify-between">
                                    Invoices
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <div className="text-xs text-[var(--text)] mt-auto relative z-10 font-medium flex flex-col gap-1 leading-relaxed">
                                    {hasActivity ? "Your invoice workspace is actively processing data." : "Workspace is ready for your first estimate."}
                                    {hasActivity && <span className="text-[10px] text-emerald-500/80 flex items-center gap-1 cursor-pointer hover:text-emerald-600 transition-colors mt-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>Track Tax Exposure</span>}
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gray-100 dark:from-white/5 to-transparent opacity-50 z-0">
                                    <div className="flex items-center justify-center h-full opacity-20">
                                        <div className="w-3/4 h-[2px] bg-gray-400 rotate-12"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Summary */}
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col min-h-[110px] shadow-sm relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
                                <div className="text-sm font-medium text-[var(--muted)] mb-1 flex items-center justify-between">
                                    Revenue
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="text-xs text-[var(--text)] mt-auto relative z-10 font-medium flex flex-col gap-1 leading-relaxed">
                                    {hasActivity ? "Sufficient data is being gathered to project margins." : "Setup incomplete. Margins locked."}
                                    {hasActivity && <span className="text-[10px] text-[var(--muted)] flex items-center gap-1 cursor-pointer hover:text-[var(--text)] transition-colors mt-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>Open Calculator</span>}
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gray-100 dark:from-white/5 to-transparent opacity-50 z-0">
                                    <div className="w-full h-full flex items-end opacity-20">
                                        <svg className="w-full h-8 text-gray-400" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none"><path d="M0 100 C 20 80, 40 100, 60 50 S 80 80, 100 20 V 100 Z" fill="currentColor"/></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Insights Summary */}
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col min-h-[110px] shadow-sm bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
                                <div className="text-sm font-medium text-indigo-500 dark:text-indigo-400 mb-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        Insights
                                    </span>
                                </div>
                                <div className="text-xs text-[var(--text)] mt-auto relative z-10 font-medium leading-relaxed">
                                    {hasActivity ? "AI models are observing your operational workflow." : "Insights locked pending business activity."}
                                </div>
                                <div className="absolute -bottom-4 -right-4 text-indigo-500/10">
                                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15 8L21 9L16 14L18 20L12 17L6 20L8 14L3 9L9 8L12 2Z"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Workspace Continuity (Recent Activity) */}
                    <div className="mt-6 space-y-4 pb-8">
                        <h3 className="text-lg font-bold text-[var(--text)] px-2 tracking-tight">Your Session</h3>
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[180px] shadow-sm relative overflow-hidden">
                            
                            {/* Background decoration */}
                            <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>

                            {hasActivity ? (
                                <>
                                    <div className="relative mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm relative z-10">
                                            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                    </div>
                                    <h4 className="text-base font-semibold text-[var(--text)] mb-1.5">Session Logging Active</h4>
                                    <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed mb-4">
                                        Your tool states and cross-workflow continuity are being safely recorded.
                                    </p>
                                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 flex items-start gap-3 max-w-md text-left w-full mx-auto">
                                        <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-xs text-[var(--muted)] leading-relaxed">
                                            <span className="font-semibold text-[var(--text)]">Vero Tip:</span> You can use the Business Calculator to track profit margins and instantly port that data into an Invoice Estimate.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="relative mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-sm relative z-10">
                                            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        </div>
                                    </div>
                                    <h4 className="text-base font-semibold text-[var(--text)] mb-1.5">Ready for your first session</h4>
                                    <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed">
                                        Tap the Vero button below to start an interactive chat, or pick a tool from the carousel to begin.
                                    </p>
                                </>
                            )}
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

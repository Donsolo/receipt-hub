import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import LensUploader from '@/components/vero-lens/LensUploader';
import LensResultsPanel from '@/components/vero-lens/LensResultsPanel';
import PricingPresetModal from '@/components/vero-lens/PricingPresetModal';
import BusinessContextSelector from '@/components/vero-lens/BusinessContextSelector';
import { usePlatform } from '@/lib/platform';

export default function VeroLensPage() {
    const router = useRouter();
    const { isNativeAndroid } = usePlatform();
    const [loading, setLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [tradeMode, setTradeMode] = useState<string>('general');
    const [usePricingPreset, setUsePricingPreset] = useState<boolean>(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    useEffect(() => {
        const checkAuthAndInit = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/profile`, { headers: { ...((await getAuthHeader()) as any) } });
                if (!res.ok) throw new Error('Unauthorized');
                const data = await res.json();
                
                const isUserPro = (data.plan === 'PRO' && data.planStatus !== 'inactive') || data.role === 'ADMIN' || data.role === 'SUPER_ADMIN';
                setIsPro(isUserPro);

                if (isUserPro) {
                    // Create initial draft session
                    const sessionRes = await fetch(`${API_BASE_URL}/api/vero/lens/sessions`, { 
                        method: 'POST',
                        headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tradeMode })
                    });
                    if (sessionRes.ok) {
                        const newSession = await sessionRes.json();
                        setSession(newSession);
                    }
                }
            } catch (err) {
                console.error("Auth check failed", err);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };
        checkAuthAndInit();
    }, [router, tradeMode]);

    const handleUploadComplete = async (image: any) => {
        if (!session) return;
        setIsAnalyzing(true);
        
        try {
            const analyzeRes = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/analyze`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ tradeMode, usePricingPreset })
            });
            
            if (analyzeRes.ok) {
                await refreshSession();
            } else {
                alert("Analysis failed. Please try again.");
            }
        } catch (err) {
            console.error("Analyze error:", err);
            alert("Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const refreshSession = async () => {
        if (!session) return;
        const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}`, { headers: { ...((await getAuthHeader()) as any) } });
        if (res.ok) {
            const data = await res.json();
            setSession(data);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--muted)]">
                <div className="animate-pulse">Loading Vero Lens...</div>
            </div>
        );
    }

    if (!isPro) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-6 text-center">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Vero+ Required</h1>
                <p className="text-[var(--muted)] mb-8 max-w-sm">
                    Vero Lens is an advanced AI camera estimate builder available exclusively on Vero+.
                </p>
                {!isNativeAndroid ? (
                    <button 
                        onClick={() => router.push('/dashboard/billing')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all hover:-translate-y-1"
                    >
                        Upgrade to Vero+
                    </button>
                ) : (
                    <p className="text-sm font-medium text-amber-500 bg-amber-500/10 px-4 py-2 rounded-lg">
                        Please upgrade to Vero+ on our web app to access this feature.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] font-sans pb-32 relative overflow-hidden">
            {/* Ambient Depth Backgrounds */}
            <div className="absolute top-0 left-0 right-0 h-[800px] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.05),transparent)] pointer-events-none -z-20"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(56,189,248,0.03),transparent)] pointer-events-none -z-20"></div>
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
                {/* Hero Header */}
                <div className="mb-12 text-center sm:text-left relative z-10 group">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none transition-opacity duration-1000 opacity-70 group-hover:opacity-100"></div>
                    <div className="relative -mt-6 animate-in fade-in duration-1000 ease-out flex justify-center sm:justify-start">
                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(99,102,241,0.15)] border border-[var(--border)] transition-all duration-700 ease-out hover:shadow-[0_25px_60px_rgba(99,102,241,0.25)] hover:-translate-y-1 w-full max-w-2xl bg-[#0f111a]">
                            <img 
                                src="/images/Vero-lens-hero.png" 
                                alt="Turn Photos Into Professional Estimates" 
                                className="w-full object-cover"
                            />
                            {/* Subtle dark gradient overlay for depth */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent opacity-80 pointer-events-none mix-blend-overlay"></div>
                            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem] pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                {/* Instant Value Strip (Draft State Only) */}
                {session?.status === 'DRAFT' && !isAnalyzing && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-12">
                        {[
                            { title: 'Snap Photos', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
                            { title: 'AI Detection', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
                            { title: 'Smart Estimates', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
                            { title: 'Customer Quotes', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
                        ].map((feature, idx) => (
                            <div key={idx} className="group relative bg-white/40 dark:bg-[#11131F]/60 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-2xl p-5 flex flex-col items-center text-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)] transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none"></div>
                                <div className="w-12 h-12 rounded-full bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/30 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-all duration-300">
                                    <svg className="w-5 h-5 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold text-[var(--text)] tracking-tight">{feature.title}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trade Mode Selector (Only show before analysis) */}
                {session?.status === 'DRAFT' && !isAnalyzing && (
                    <div className="mb-12 bg-white/60 dark:bg-[#11131F]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.08)] transition-all duration-500 relative z-30 group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-8 relative z-30">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-800/20 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-700/30 shadow-inner">
                                <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-lg font-bold text-[var(--text)] mb-1 tracking-tight">Business Context</label>
                                <p className="text-sm text-[var(--muted)] opacity-80 mb-5 leading-relaxed font-light">Selecting a specific trade improves Vero AI's accuracy for materials and labor context.</p>
                                <div className="relative z-20">
                                    <BusinessContextSelector 
                                        value={tradeMode} 
                                        onChange={(val) => setTradeMode(val)} 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]/60 mt-2 relative z-10">
                            <label className="flex items-center gap-4 cursor-pointer group/toggle">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={usePricingPreset}
                                        onChange={(e) => setUsePricingPreset(e.target.checked)}
                                    />
                                    <div className={clsx("block w-14 h-7 rounded-full transition-colors border", usePricingPreset ? "bg-indigo-600 border-indigo-600 shadow-inner" : "bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700")}></div>
                                    <div className={clsx("dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-md", usePricingPreset ? "transform translate-x-7 shadow-[0_0_12px_rgba(255,255,255,0.6)]" : "")}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-bold text-[var(--text)] group-hover/toggle:text-indigo-600 dark:group-hover/toggle:text-indigo-400 transition-colors tracking-tight">AI Intelligence Mode</span>
                                    <span className="text-[11px] text-[var(--muted)] opacity-70 uppercase tracking-widest font-bold">Apply My Pricing Presets</span>
                                </div>
                            </label>
                            
                            <button 
                                onClick={() => setShowSettingsModal(true)}
                                className="text-sm text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400 font-bold transition-all bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-4 py-2 rounded-xl active:scale-95"
                            >
                                Configure
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="space-y-8">
                    {/* Upload State */}
                    {session?.status === 'DRAFT' && !isAnalyzing && (
                        <div className="space-y-8 relative">
                            <div className="bg-[var(--card)] border-2 border-dashed border-[var(--border)] rounded-[2.5rem] p-10 sm:p-16 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-indigo-400 dark:hover:border-indigo-600/60 transition-all duration-500 ease-out">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 scale-150"></div>
                                
                                <div className="w-28 h-28 bg-white dark:bg-[#1A1D27] rounded-full flex items-center justify-center mb-10 relative z-10 shadow-xl shadow-indigo-500/10 border border-gray-100 dark:border-gray-800 group-hover:scale-[1.03] group-hover:shadow-indigo-500/25 transition-all duration-500">
                                    <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-[ping_3s_ease-in-out_infinite]"></div>
                                    <div className="absolute inset-2 rounded-full border border-indigo-400/20 animate-[ping_4s_ease-in-out_infinite] delay-700"></div>
                                    <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-extrabold text-[var(--text)] mb-4 tracking-tight">Snap a photo to start</h2>
                                <p className="text-[var(--muted)] opacity-80 max-w-lg mx-auto mb-12 text-lg font-light leading-relaxed">
                                    Upload a picture of the job site or damage. Vero AI will scan it and draft a professional starter estimate.
                                </p>
                                
                                <div className="w-full max-w-lg mx-auto relative z-10">
                                    <LensUploader sessionId={session?.id} onUploadComplete={handleUploadComplete} />
                                </div>
                            </div>
                            
                            {/* Trust Layer */}
                            <div className="max-w-3xl mx-auto bg-gray-50/50 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl py-4 px-6 border border-[var(--border)] shadow-sm">
                                <div className="flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]/60 text-[13px] font-semibold text-[var(--muted)] opacity-90">
                                    <div className="flex items-center gap-2.5 px-6 py-3 sm:py-0 w-full sm:w-auto justify-center">
                                        <svg className="w-4.5 h-4.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                        <span>Secure Cloud Processing</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 px-6 py-3 sm:py-0 w-full sm:w-auto justify-center">
                                        <svg className="w-4.5 h-4.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                        <span>Professional AI Assisted</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 px-6 py-3 sm:py-0 w-full sm:w-auto justify-center">
                                        <svg className="w-4.5 h-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                        <span>Private & Encrypted</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Analyzing State */}
                    {isAnalyzing && (
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-sm animate-in fade-in duration-500">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center relative z-10">
                                    <svg className="w-10 h-10 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Vero AI is analyzing...</h2>
                            <p className="text-[var(--muted)]">Detecting objects, measuring scale, and drafting line items.</p>
                        </div>
                    )}

                    {/* Results State */}
                    {session?.status === 'NEEDS_REVIEW' && !isAnalyzing && (
                        <LensResultsPanel session={session} onLineItemUpdate={refreshSession} />
                    )}
                </div>
            </div>

            <PricingPresetModal 
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                tradeMode={tradeMode}
            />
        </div>
    );
}

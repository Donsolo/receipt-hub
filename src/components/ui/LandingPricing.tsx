"use client";

import Link from 'next/link';
import { usePlatform } from '@/lib/platform';

export default function LandingPricing() {
    const { isNativeAndroid } = usePlatform();

    if (isNativeAndroid) {
        return null; // Completely hide pricing section in Android native app
    }

    return (
        <div className="w-full max-w-5xl mx-auto py-16 relative z-10 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Flexible Plans for Professionals</h2>
                <p className="mt-4 text-[var(--muted)] text-lg max-w-2xl mx-auto">
                    Choose the plan that fits your business needs. Upgrade anytime as you grow.
                </p>
            </div>

            {/* Mobile Horizontal Scroll Container */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 pt-4 px-4 -mx-4 md:grid md:grid-cols-2 md:gap-8 md:overflow-visible md:snap-none md:px-0 md:mx-0 hide-scrollbar"
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
                
                {/* Core Plan Card */}
                <div className="shrink-0 w-[85vw] sm:w-[350px] md:w-auto snap-center bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between overflow-hidden shadow-2xl relative transition-transform hover:-translate-y-1">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text)] mb-2">Core</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-extrabold text-white">Free</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-[var(--muted)]">
                                <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Standard Receipt Generation
                            </li>
                            <li className="flex items-center text-[var(--muted)]">
                                <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Basic Cloud Vault
                            </li>
                            <li className="flex items-center text-[var(--muted)]">
                                <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                30-Day Summary Reports
                            </li>
                        </ul>
                    </div>
                    <Link href="/pricing" className="w-full py-3 rounded-lg bg-[var(--border)] hover:bg-slate-700 text-white font-semibold transition-colors text-center inline-block">
                        View Details
                    </Link>
                </div>

                {/* Pro Plan Card */}
                <div className="shrink-0 w-[85vw] sm:w-[350px] md:w-auto snap-center bg-gradient-to-br from-[#111827] to-[#0F172A] border border-indigo-500/30 rounded-2xl p-8 flex flex-col justify-between overflow-hidden shadow-[0_0_30px_rgba(79,70,229,0.15)] relative transition-transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 pointer-events-none" />
                    <div className="relative">
                        <h3 className="text-xl font-bold text-indigo-400 mb-2">Pro</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-extrabold text-white">$12.99</span>
                            <span className="text-[var(--muted)]">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-white">
                                <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Unlimited Invoicing & Reports
                            </li>
                            <li className="flex items-center text-white">
                                <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Intelligent Item Memory
                            </li>
                            <li className="flex items-center text-white">
                                <svg className="w-5 h-5 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                AI Scanning & Custom Logos
                            </li>
                        </ul>
                    </div>
                    <Link href="/pricing" className="relative w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors text-center inline-block shadow-lg shadow-indigo-500/25">
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    );
}

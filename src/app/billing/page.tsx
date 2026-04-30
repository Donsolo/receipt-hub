"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BillingPage() {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<'CORE' | 'PRO' | null>(null);
    const [hasStripe, setHasStripe] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        // Fetch user profile to determine current plan
        fetch('/api/user/profile')
            .then(res => res.json())
            .then(data => {
                setPlan(data.plan || 'CORE');
                setHasStripe(!!data.stripeCustomerId);
                setFetching(false);
            })
            .catch(() => {
                setFetching(false);
            });
    }, []);

    const [error, setError] = useState<string | null>(null);

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/billing/create-checkout-session', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error(data.error);
                setError(data.error || 'Failed to initialize checkout.');
                setLoading(false);
            }
        } catch (error: any) {
            console.error(error);
            setError(error?.message || 'Failed to initialize checkout.');
            setLoading(false);
        }
    };

    const handleManageBilling = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/billing/create-portal-session', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error(data.error);
                setError(data.error || 'Failed to open billing portal.');
                setLoading(false);
            }
        } catch (error: any) {
            console.error(error);
            setError(error?.message || 'Failed to open billing portal.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text)]">Subscription & Billing</h1>
                    <Link href="/dashboard" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                        Back to Dashboard
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-sm flex items-center">
                        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {fetching ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-[var(--border)] rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-[var(--border)] rounded"></div>
                                <div className="h-4 bg-[var(--border)] rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* CORE TIER */}
                        <div className={`relative p-8 rounded-2xl border ${plan === 'CORE' ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] shadow-md' : 'border-[var(--border)]'} bg-[var(--card)]`}>
                            {plan === 'CORE' && (
                                <div className="absolute top-0 right-0 -mt-3 mr-4 px-3 py-1 bg-[var(--primary)] text-white text-xs font-bold uppercase rounded-full">
                                    Current Plan
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Core Plan</h2>
                            <p className="text-[var(--muted)] text-sm mb-6">Essential tools for organizing receipts.</p>
                            <div className="text-3xl font-bold text-[var(--text)] mb-6">Free</div>
                            
                            <ul className="space-y-3 mb-8 text-sm text-[var(--text)]">
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Manual receipts
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Invoices
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Basic sharing
                                </li>
                            </ul>
                            
                            {plan === 'CORE' ? (
                                <button disabled className="w-full py-3 px-4 bg-[var(--border)] text-[var(--muted)] rounded-lg font-medium cursor-not-allowed">
                                    Active
                                </button>
                            ) : null}
                        </div>

                        {/* PRO TIER */}
                        <div className={`relative p-8 rounded-2xl border ${plan === 'PRO' ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] shadow-md' : 'border-[var(--border)]'} bg-[var(--card)]`}>
                            {plan === 'PRO' && (
                                <div className="absolute top-0 right-0 -mt-3 mr-4 px-3 py-1 bg-[var(--primary)] text-white text-xs font-bold uppercase rounded-full">
                                    Current Plan
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Pro Plan</h2>
                            <p className="text-[var(--muted)] text-sm mb-6">Advanced intelligence and branding.</p>
                            <div className="text-3xl font-bold text-[var(--text)] mb-6">$12.99<span className="text-base font-normal text-[var(--muted)]">/month</span></div>
                            
                            <ul className="space-y-3 mb-8 text-sm text-[var(--text)]">
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Everything in Core
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-[var(--primary)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <span className="font-semibold">OCR scanning (AI automation)</span>
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-[var(--primary)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <span className="font-semibold">Business logo upload</span>
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-5 h-5 text-[var(--primary)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Advanced tools
                                </li>
                            </ul>
                            
                            {plan === 'CORE' ? (
                                <button 
                                    onClick={handleUpgrade}
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg font-medium transition-colors"
                                >
                                    {loading ? 'Redirecting...' : 'Upgrade to Pro'}
                                </button>
                            ) : hasStripe ? (
                                <button 
                                    onClick={handleManageBilling}
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--text)] rounded-lg font-medium transition-colors"
                                >
                                    {loading ? 'Redirecting...' : 'Manage Billing'}
                                </button>
                            ) : (
                                <div className="w-full py-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 rounded-lg text-sm border border-indigo-200 dark:border-indigo-800/50">
                                    <div className="font-semibold mb-1 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Pro Access Active
                                    </div>
                                    This account has manual/admin Pro access. Billing portal is not available for this account.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

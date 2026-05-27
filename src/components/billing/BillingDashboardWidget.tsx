"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function BillingDashboardWidget() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/billing/summary')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSummary(data.data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
        );
    }

    const incoming = summary?.incoming;
    const hasIncoming = incoming && incoming.unpaidCount > 0;

    if (!hasIncoming && (!summary || summary.outgoing.unpaidCount === 0)) {
        return (
            <div className="bg-white/60 dark:bg-[#11131F]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-[var(--text)]">Billing Center</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">You have no pending invoices.</p>
                </div>
                <Link href="/dashboard/billing" className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                    Go to Billing
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 sm:p-8 shadow-lg shadow-indigo-500/20 mb-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold">Billing Center</h3>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 sm:gap-8">
                        {incoming?.unpaidCount > 0 && (
                            <div>
                                <p className="text-indigo-100 text-sm font-medium">To Pay</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${(incoming.outstandingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                                        {incoming.unpaidCount} incoming
                                    </span>
                                    {incoming.overdueCount > 0 && (
                                        <span className="text-xs font-semibold bg-red-500/80 px-2 py-0.5 rounded-full">
                                            {incoming.overdueCount} overdue
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {summary?.outgoing?.unpaidCount > 0 && (
                            <div>
                                <p className="text-indigo-100 text-sm font-medium">To Collect</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${(summary.outgoing.outstandingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="mt-1">
                                    <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                                        {summary.outgoing.unpaidCount} outgoing
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0">
                    <Link 
                        href="/dashboard/billing" 
                        className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                        View Billing
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}

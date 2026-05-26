"use client";

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export default function CompactStatsGrid({ stats }: { stats: { total: number, sent: number, viewed: number, overdue: number } }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('invoice_stats_collapsed');
        if (saved) {
            setIsCollapsed(saved === 'true');
        }
    }, []);

    const toggleCollapse = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        localStorage.setItem('invoice_stats_collapsed', String(newValue));
    };

    if (!mounted) return null;

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
            <button 
                onClick={toggleCollapse}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-bold text-[var(--text)]">Analytics Overview</span>
                </div>
                <div className="flex items-center gap-2">
                    {isCollapsed && (
                        <span className="text-xs font-bold text-[var(--muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-md">
                            ${stats.total} Total
                        </span>
                    )}
                    <svg className={clsx("w-4 h-4 text-[var(--muted)] transition-transform duration-300", isCollapsed ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </button>
            
            <div className={clsx("transition-all duration-300 overflow-hidden", isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100")}>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--card)]">
                    <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Total Invoices</span>
                        <span className="text-xl font-black text-[var(--text)] tabular-nums">{stats.total}</span>
                    </div>
                    <div className="flex flex-col p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Sent</span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{stats.sent}</span>
                    </div>
                    <div className="flex flex-col p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Viewed</span>
                        <span className="text-xl font-black text-purple-600 dark:text-purple-400 tabular-nums">{stats.viewed}</span>
                    </div>
                    <div className="flex flex-col p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Overdue</span>
                        <span className="text-xl font-black text-red-600 dark:text-red-400 tabular-nums">{stats.overdue}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

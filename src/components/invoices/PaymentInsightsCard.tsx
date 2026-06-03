import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function PaymentInsightsCard({ invoiceId }: { invoiceId: string }) {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/payment-insights`, { headers: { ...((await getAuthHeader()) as any) } });
                const data = await res.json();
                if (data.success) {
                    setInsights(data.insights);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [invoiceId]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#0b1220] rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10 animate-pulse">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 w-1/3 rounded mb-4"></div>
                <div className="flex gap-4">
                    <div className="h-12 bg-gray-200 dark:bg-gray-800 w-1/4 rounded-xl"></div>
                    <div className="h-12 bg-gray-200 dark:bg-gray-800 w-1/4 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!insights) return null; // Free user or error, just hide silently

    const renderBadge = () => {
        switch(insights.conversionState) {
            case 'PAID': return <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg">Settled</span>;
            case 'PARTIAL_PAID': return <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg">Partially Paid</span>;
            case 'CLICKED_UNPAID': return <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg">High Intent (Clicked Pay)</span>;
            case 'VIEWED_UNPAID': return <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg">Viewed</span>;
            default: return <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 rounded-lg">Unseen</span>;
        }
    };

    return (
        <div className="bg-white dark:bg-[#0b1220] rounded-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Engagement Insights
                    </h3>
                    {renderBadge()}
                </div>
                <p className="text-sm text-gray-500 dark:text-[var(--muted)]">Track how the customer interacts with this invoice.</p>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="bg-gray-50 dark:bg-white/[0.02] px-4 py-2 rounded-xl border border-black/5 dark:border-white/5">
                    <div className="text-xs text-gray-500 dark:text-[var(--muted)] font-bold uppercase tracking-wider mb-0.5">Total Views</div>
                    <div className="text-lg font-black text-gray-900 dark:text-white flex items-baseline gap-2">
                        {insights.totalViews}
                        {insights.lastViewedAt && <span className="text-xs font-medium text-gray-400 truncate max-w-[100px]">{formatDistanceToNow(new Date(insights.lastViewedAt))} ago</span>}
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Pay Clicks</div>
                    <div className="text-lg font-black text-indigo-900 dark:text-indigo-300">{insights.ctaClicks}</div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-100 dark:border-orange-500/20">
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider mb-0.5">Reminders Sent</div>
                    <div className="text-lg font-black text-orange-900 dark:text-orange-300 flex items-baseline gap-2">
                        {insights.reminderCount}
                        {insights.lastReminderAt && <span className="text-xs font-medium text-orange-500/70 truncate max-w-[100px]">{formatDistanceToNow(new Date(insights.lastReminderAt))} ago</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

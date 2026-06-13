"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function InvoiceAgingDashboard() {
    const [buckets, setBuckets] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => fetch(`${API_BASE_URL}/api/invoices/aging`, { headers: { ...((await getAuthHeader()) as any) } }))()
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setBuckets(data.buckets);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const copyLink = (token: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app';
        const link = `${baseUrl}/portal/invoice/${token}?src=copy`;
        navigator.clipboard.writeText(link);
        alert('Secure portal link copied to clipboard!');
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-8 animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 w-1/4 rounded"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-800 w-full rounded-2xl"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-800 w-full rounded-2xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-8 text-center text-red-500">
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>{error}</p>
                <Link href="/dashboard" className="text-indigo-500 hover:underline mt-4 inline-block">Return to Dashboard</Link>
            </div>
        );
    }

    const renderBucket = (title: string, data: any[], colorClass: string) => {
        if (!data || data.length === 0) return null;
        return (
            <section className="bg-white dark:bg-[#0b1220] rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden mb-8">
                <div className={`px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between ${colorClass}`}>
                    <h3 className="font-bold">{title}</h3>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">{data.length} Invoices</span>
                </div>
                <div className="divide-y divide-black/5 dark:divide-white/10">
                    {data.map(inv => (
                        <div key={inv.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                            <div className="flex-1">
                                <Link href={`/dashboard/invoices/edit/${inv.id}`} className="font-bold text-gray-900 dark:text-white hover:text-indigo-500 hover:underline">
                                    {inv.title || inv.invoiceNumber}
                                </Link>
                                <div className="text-sm text-gray-500 dark:text-[var(--muted)] mt-1">
                                    {inv.clientName} {inv.clientEmail && `(${inv.clientEmail})`}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Due: {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : 'N/A'} • Last Reminder: {inv.lastPaymentReminderAt ? format(new Date(inv.lastPaymentReminderAt), 'MMM d') : 'Never'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                                    ${(inv.remainingBalance || inv.total).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Remaining</div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                {inv.publicToken && (
                                    <button onClick={() => copyLink(inv.publicToken)} className="flex-1 md:flex-none px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold transition-colors">
                                        Copy Link
                                    </button>
                                )}
                                <Link href={`/dashboard/invoices/edit/${inv.id}`} className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold transition-colors text-center">
                                    Manage
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const hasAnyInvoices = Object.values(buckets).some((arr: any) => arr.length > 0);

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Invoice Aging</h1>
                    <p className="text-gray-500 dark:text-[var(--muted)] mt-2">Track outstanding balances and follow up faster.</p>
                </div>
                
                <div className="flex gap-2">
                    <a href="/api/reports/invoices.csv" download className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-bold rounded-lg transition-colors">
                        Export Invoices
                    </a>
                    <a href="/api/reports/payments.csv" download className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-bold rounded-lg transition-colors">
                        Export Payments
                    </a>
                    <a href="/api/reports/aging.csv" download className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-sm font-bold rounded-lg transition-colors">
                        Export Aging
                    </a>
                </div>
            </div>

            {!hasAnyInvoices ? (
                <div className="text-center py-24 bg-white dark:bg-[#0b1220] rounded-3xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="text-gray-500 dark:text-[var(--muted)] mt-2">You have no unpaid or overdue invoices.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {renderBucket('60+ Days Overdue', buckets.days60Plus, 'bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-400')}
                    {renderBucket('31–60 Days Overdue', buckets.days31to60, 'bg-orange-50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-400')}
                    {renderBucket('16–30 Days Overdue', buckets.days16to30, 'bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-400')}
                    {renderBucket('1–15 Days Overdue', buckets.days1to15, 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-900 dark:text-yellow-400')}
                    {renderBucket('Current (Not Overdue)', buckets.current, 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400')}
                    {renderBucket('No Due Date', buckets.noDueDate, 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white')}
                </div>
            )}
        </div>
    );
}

"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import KpiCard from '@/components/vero-lens/analytics/KpiCard';
import FunnelChart from '@/components/vero-lens/analytics/FunnelChart';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';

function LensAnalyticsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rangeParam = searchParams.get('range');
    const [payload, setPayload] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const headers = await getAuthHeader();
                const url = new URL(`${API_BASE_URL}/api/vero/lens/analytics`);
                if (rangeParam) {
                    url.searchParams.set('range', rangeParam);
                }

                const res = await fetch(url.toString(), {
                    headers: { ...headers as any, 'Content-Type': 'application/json' }
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }

                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setPayload(json);
                    }
                }
            } catch (err) {
                console.error("Failed to load analytics data", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [router, rangeParam]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center pb-32">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (!payload) return <div className="p-8 text-center text-[var(--muted)]">Failed to load analytics</div>;

    const { data, insights, daysBack } = payload;

    return (
        <div className="min-h-screen bg-[var(--bg)] font-sans pb-32">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight">Lens Analytics</h1>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 uppercase tracking-widest border border-indigo-500/20">
                                BETA
                            </span>
                        </div>
                        <p className="text-[var(--muted)]">Track quote performance, conversion, and customer engagement.</p>
                    </div>
                    
                    {/* Time Filter */}
                    <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-lg p-1">
                        <Link href="?range=7" className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", daysBack === 7 ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)]')}>7D</Link>
                        <Link href="?range=30" className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", daysBack === 30 ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)]')}>30D</Link>
                        <Link href="?range=all" className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", daysBack === null ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)]')}>All Time</Link>
                    </div>
                </div>

                {/* Insights Banner */}
                {insights.length > 0 && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 mb-8 flex gap-4 items-start">
                        <div className="bg-indigo-500/20 text-indigo-500 p-2 rounded-xl shrink-0 mt-0.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">AI Insights</h3>
                            <ul className="list-disc list-inside text-sm text-[var(--muted)] space-y-1">
                                {insights.map((insight: any, idx: number) => (
                                    <li key={idx}>{insight}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KpiCard 
                        title="Total Quotes" 
                        value={data.metrics.totalQuotesCreated}
                        description="Estimates drafted in Vero Lens." 
                    />
                    <KpiCard 
                        title="Approval Rate" 
                        value={`${Math.round(data.metrics.approvalRate * 100)}%`} 
                        description="Percentage of shared quotes approved."
                        trend={data.metrics.approvalRate >= 0.5 ? 'up' : 'neutral'}
                        trendText="Rate"
                    />
                    <KpiCard 
                        title="Avg Approval Time" 
                        value={data.metrics.averageApprovalTimeHours < 24 
                            ? `${Math.round(data.metrics.averageApprovalTimeHours)} hr` 
                            : `${Math.round(data.metrics.averageApprovalTimeHours / 24)} d`} 
                        description="From share to signature." 
                    />
                    <KpiCard 
                        title="Invoices Created" 
                        value={data.metrics.convertedToInvoiceCount} 
                        description="Quotes successfully billed."
                        trend={data.metrics.convertedToInvoiceCount > 0 ? 'up' : undefined}
                        trendText="Converted"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Funnel */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <FunnelChart data={data.funnel} />
                        
                        {/* Secondary Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Total Views</p>
                                <p className="text-xl font-bold text-[var(--text)]">{data.metrics.totalViews}</p>
                            </div>
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Avg Views/Apprv</p>
                                <p className="text-xl font-bold text-[var(--text)]">{data.metrics.averageViewsBeforeApproval.toFixed(1)}</p>
                            </div>
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Revisions Req.</p>
                                <p className="text-xl font-bold text-[var(--text)]">{data.metrics.totalRevisionsRequested}</p>
                            </div>
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Reminders Sent</p>
                                <p className="text-xl font-bold text-[var(--text)]">{data.metrics.totalRemindersSent}</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="lg:col-span-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col max-h-[600px] overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)] shrink-0">
                            <h3 className="text-lg font-bold text-[var(--text)]">Recent Activity</h3>
                            <p className="text-xs text-[var(--muted)] mt-1">Global quote engagement</p>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {data.timeline.length === 0 ? (
                                <p className="text-sm text-[var(--muted)] text-center py-8">No recent activity found.</p>
                            ) : (
                                data.timeline.map((event: any) => (
                                    <div key={event.id} className="relative pl-6 pb-2">
                                        <div className="absolute top-2 bottom-[-24px] left-[9px] w-[2px] bg-[var(--border)] last:hidden"></div>
                                        <div className={clsx(
                                            "absolute top-1.5 left-0 w-5 h-5 rounded-full border-4 border-[var(--card)] flex items-center justify-center",
                                            event.type === 'QUOTE_APPROVED' ? "bg-emerald-500" :
                                            event.type === 'QUOTE_REJECTED' ? "bg-red-500" :
                                            event.type === 'QUOTE_VIEWED' || event.type === 'QUOTE_REOPENED' ? "bg-blue-500" :
                                            event.type === 'CONVERTED_TO_INVOICE' ? "bg-indigo-500" :
                                            event.type === 'REMINDER_SENT' ? "bg-amber-500" :
                                            event.type === 'QUOTE_REVISION_REQUESTED' ? "bg-orange-500" :
                                            "bg-gray-400"
                                        )}></div>
                                        
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text)]">
                                                {event.type.replace(/_/g, ' ')}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-xs text-[var(--muted)]">{format(new Date(event.createdAt), 'MMM d, h:mm a')}</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] rounded uppercase">
                                                    {event.session.tradeMode}
                                                </span>
                                            </div>
                                            {event.message && (
                                                <p className="text-xs text-[var(--muted)] mt-2 bg-[var(--bg)] p-2 rounded-lg border border-[var(--border)] shadow-sm">
                                                    "{event.message}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LensAnalyticsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div></div>}>
            <LensAnalyticsContent />
        </Suspense>
    );
}

# Invoice System Codebase


## src\app\dashboard\invoices\page.tsx
```tsx

import { cookies, headers } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import InvoiceActions from '@/components/invoices/InvoiceActions';
import { IconFileInvoice, IconClock, IconDotsVertical } from '@tabler/icons-react';

export const dynamic = "force-dynamic";

export default async function InvoicesHub(props: { searchParams?: Promise<{ filter?: string, sort?: string }> }) {
    const searchParams = await props.searchParams;
    const filterParam = searchParams?.filter || 'all';
    const sortParam = searchParams?.sort || 'newest';

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        return <div>Unauthorized</div>;
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";
    
    if (!isPro) {
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || '';
        const isMobileApp = /Capacitor|wv/i.test(userAgent);

        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] relative">
                {/* Minimal hero block for Unauthorized State */}
                <div className="relative bg-[#0B0F1A] w-full px-4 pt-8 pb-32">
                     <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.10) 1px, transparent 1px)', backgroundSize: '32px 32px', animation: 'grid-drift 8s linear infinite' }} />
                </div>
                
                {/* Modal Overlay Background */}
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
                
                {/* Modal Dialog */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-[var(--border)]">
                        <div className="p-8 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-inner ring-4 ring-blue-50 dark:ring-blue-900/20">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Pro Feature</h2>
                            <p className="text-gray-500 dark:text-[var(--muted)] mb-8 text-sm">
                                Professional invoicing and secure payment requests are exclusive to Pro members.
                            </p>
                            
                            {isMobileApp ? (
                                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5 w-full">
                                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                                        To upgrade your account and unlock these features, please visit <strong className="font-bold underline decoration-blue-500/50">verihub.app</strong> in your web browser.
                                    </p>
                                </div>
                            ) : (
                                <Link href="/upgrade" className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-lg">
                                    Upgrade to Pro
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </Link>
                            )}
                            
                            <Link href="/dashboard" className="mt-6 text-sm font-bold text-gray-400 hover:text-gray-600 dark:text-[var(--muted)] dark:hover:text-white transition-colors">
                                Return to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    let invoices: any[] = [];
    let stats = { total: 0, sent: 0, viewed: 0, overdue: 0, totalAmount: 0, sentAmount: 0, viewedAmount: 0, overdueAmount: 0 };
    let fetchError: string | null = null;
    try {
        const allInvoices = await db.invoice.findMany({
            where: {
                OR: [
                    { userId: authUser.userId },
                    { paymentRequestLogs: { some: { recipientUserId: authUser.userId } } }
                ]
            },
            include: { 
                items: true,
                user: { select: { name: true, businessName: true } }
            }
        });

        const now = new Date();
        const processed = allInvoices.map(inv => {
            const times = [inv.createdAt, inv.sentAt, inv.lastViewedAt, inv.paymentConfirmedAt].filter(Boolean).map(t => new Date(t as Date).getTime());
            
            // Increment Stats
            stats.total++;
            stats.totalAmount += inv.total;
            if (inv.status === 'SENT') { stats.sent++; stats.sentAmount += inv.total; }
            if (inv.status === 'VIEWED') { stats.viewed++; stats.viewedAmount += inv.total; }
            if (inv.status !== 'PAID' && inv.dueDate && inv.dueDate < now) { stats.overdue++; stats.overdueAmount += inv.total; }

            return {
                ...inv,
                lastActivityAt: new Date(Math.max(...times))
            };
        });

        // Filter
        invoices = processed.filter(inv => {
            if (filterParam === 'all') return true;
            if (filterParam === 'overdue') return inv.status !== 'PAID' && inv.dueDate && inv.dueDate < now;
            return inv.status === filterParam.toUpperCase();
        });

        // Sort
        if (sortParam === 'activity') {
            invoices.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
        } else {
            invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

    } catch (e: any) {
        console.error('SERVER ACTION CRASH - Invoice Fetch Failed:', e);
        fetchError = e?.message || String(e) || 'Unknown Database Error';
    }

    const currentTotalSum = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const currentCount = invoices.length;

    return (
        <div className="min-h-screen bg-[#F4F5F9] dark:bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] overflow-hidden">
            
            {/* HERO SECTION */}
            <div className="relative bg-[#0B0F1A] w-full px-4 sm:px-6 pt-12 pb-12 overflow-hidden shrink-0">
                {/* Grid Overlay */}
                <div 
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(99,102,241,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.10) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        animation: 'grid-drift 8s linear infinite'
                    }}
                />
                
                {/* Glows */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#6366F1] rounded-full blur-[100px] opacity-24 z-0 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#FB923C] rounded-full blur-[80px] opacity-12 z-0 pointer-events-none" />

                <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col pt-[env(safe-area-inset-top)]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Invoices</h1>
                            <p className="text-sm font-medium text-indigo-200/70 mt-1">Create, manage & track billing</p>
                        </div>
                        <Link href="/dashboard/invoices/create" className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                            New Invoice
                        </Link>
                    </div>

                    {/* Stat Pills */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md flex flex-col">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Total</span>
                            <span className="font-mono text-[#E8ECFF] font-semibold">${stats.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md flex flex-col">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Sent</span>
                            <span className="font-mono text-[#34D399] font-semibold">${stats.sentAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md flex flex-col">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Viewed</span>
                            <span className="font-mono text-[#FBBF24] font-semibold">${stats.viewedAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md flex flex-col">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Overdue</span>
                            <span className="font-mono text-[#F87171] font-semibold">${stats.overdueAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BODY SURFACE */}
            <div className="relative z-10 flex-1 w-full bg-[#F4F5F9] dark:bg-[var(--bg)] rounded-t-[20px] -mt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col pb-24">
                
                {/* Filter Chips */}
                <div className="w-full overflow-x-auto whitespace-nowrap hide-scrollbar px-4 sm:px-6 pt-6 pb-3">
                    <div className="flex items-center gap-2 max-w-2xl mx-auto">
                        {['All', 'Draft', 'Sent', 'Viewed', 'Paid', 'Overdue'].map(f => {
                            const val = f.toLowerCase();
                            const isActive = filterParam === val;
                            return (
                                <Link 
                                    key={f}
                                    href={`/dashboard/invoices?filter=${val}&sort=${sortParam}`}
                                    className={clsx(
                                        "px-4 py-2 rounded-full text-sm font-bold transition-all border",
                                        isActive 
                                            ? "bg-[#1E2248] border-[#1E2248] text-white shadow-md dark:bg-indigo-500 dark:border-indigo-500"
                                            : "bg-white dark:bg-[var(--card)] border-[#E2E6F3] dark:border-[var(--border)] text-[#6B7280] dark:text-[var(--muted)] hover:bg-gray-50 dark:hover:bg-[var(--card-hover)]"
                                    )}
                                >
                                    {f}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Sort Row */}
                <div className="w-full px-4 sm:px-6 pb-4">
                    <div className="flex items-center gap-2 max-w-2xl mx-auto">
                        <Link 
                            href={`/dashboard/invoices?filter=${filterParam}&sort=newest`} 
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border", 
                                sortParam === 'newest' 
                                    ? "bg-[#F0F1FA] text-[#3B3F6E] border-[#C4C8E8] dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-500/30" 
                                    : "bg-transparent border-transparent text-[#6B7280] dark:text-[var(--muted)] hover:bg-gray-100 dark:hover:bg-[var(--card)]"
                            )}
                        >
                            Newest
                        </Link>
                        <Link 
                            href={`/dashboard/invoices?filter=${filterParam}&sort=activity`} 
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border", 
                                sortParam === 'activity' 
                                    ? "bg-[#F0F1FA] text-[#3B3F6E] border-[#C4C8E8] dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-500/30" 
                                    : "bg-transparent border-transparent text-[#6B7280] dark:text-[var(--muted)] hover:bg-gray-100 dark:hover:bg-[var(--card)]"
                            )}
                        >
                            Last Activity
                        </Link>
                    </div>
                </div>

                {/* Section Header */}
                <div className="w-full px-4 sm:px-6 pb-4">
                    <div className="flex justify-between items-end max-w-2xl mx-auto border-b border-[#E2E6F3] dark:border-[var(--border)] pb-2">
                        <h2 className="text-base font-bold text-[#111827] dark:text-white">All Invoices</h2>
                        <div className="text-xs font-medium text-[#6B7280] dark:text-[var(--muted)]">
                            {currentCount} {currentCount === 1 ? 'invoice' : 'invoices'} &middot; ${currentTotalSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                    </div>
                </div>

                {/* Invoice Cards */}
                <div className="w-full px-4 sm:px-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-12">
                        {fetchError ? (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-6 text-center">
                                <p className="text-red-500 text-sm font-bold">{fetchError}</p>
                            </div>
                        ) : invoices.length === 0 ? (
                            <div className="bg-white dark:bg-[var(--card)] border border-[#E2E6F3] dark:border-[var(--border)] rounded-[14px] p-8 text-center flex flex-col items-center">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500 mb-4">
                                    <IconFileInvoice className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-[#111827] dark:text-white mb-1">No invoices found</h3>
                                <p className="text-sm text-[#6B7280] dark:text-[var(--muted)] mb-6">Try adjusting your filters or create a new invoice.</p>
                                <Link href="/dashboard/invoices/create" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-sm">
                                    Create First Invoice
                                </Link>
                            </div>
                        ) : (
                            invoices.map((inv) => {
                                // Status Colors mapping
                                let iconBg = "bg-[#F1EFE8] dark:bg-gray-800";
                                let iconColor = "text-[#5F5E5A] dark:text-gray-400";
                                let pillBg = "bg-[#F1EFE8] dark:bg-gray-800";
                                let pillColor = "text-[#5F5E5A] dark:text-gray-400";
                                
                                if (inv.status === 'SENT') {
                                    iconBg = "bg-[#E6F1FB] dark:bg-blue-900/30";
                                    iconColor = "text-[#185FA5] dark:text-blue-400";
                                    pillBg = "bg-[#E6F1FB] dark:bg-blue-900/30";
                                    pillColor = "text-[#185FA5] dark:text-blue-400";
                                } else if (inv.status === 'PAID') {
                                    iconBg = "bg-[#E1F5EE] dark:bg-emerald-900/30";
                                    iconColor = "text-[#0F6E56] dark:text-emerald-400";
                                    pillBg = "bg-[#E1F5EE] dark:bg-emerald-900/30";
                                    pillColor = "text-[#0F6E56] dark:text-emerald-400";
                                } else if (inv.status === 'VIEWED') {
                                    iconBg = "bg-[#EEEDFE] dark:bg-purple-900/30";
                                    iconColor = "text-[#534AB7] dark:text-purple-400";
                                    pillBg = "bg-[#EEEDFE] dark:bg-purple-900/30";
                                    pillColor = "text-[#534AB7] dark:text-purple-400";
                                } else if (inv.status === 'CANCELLED' || (inv.status !== 'PAID' && inv.dueDate && inv.dueDate < new Date())) {
                                    // Treat overdue as red
                                    iconBg = "bg-[#FCEBEB] dark:bg-red-900/30";
                                    iconColor = "text-[#A32D2D] dark:text-red-400";
                                    pillBg = "bg-[#FCEBEB] dark:bg-red-900/30";
                                    pillColor = "text-[#A32D2D] dark:text-red-400";
                                }

                                const isOverdue = inv.status !== 'PAID' && inv.dueDate && inv.dueDate < new Date();
                                const displayStatus = isOverdue ? 'OVERDUE' : inv.status;
                                const isReceived = inv.userId !== authUser.userId;

                                return (
                                    <div key={inv.id} className="bg-white dark:bg-[var(--card)] rounded-[14px] border border-[#E2E6F3] dark:border-[var(--border)] p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex items-start gap-3 overflow-hidden">
                                                <div className={clsx("w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0", iconBg, iconColor)}>
                                                    <IconFileInvoice className="w-5 h-5" stroke={2} />
                                                </div>
                                                <div className="flex flex-col pt-0.5 overflow-hidden">
                                                    <span className="font-semibold text-[#111827] dark:text-white text-sm leading-tight truncate w-full">
                                                        {inv.title || 'Untitled Invoice'}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-[#6B7280] dark:text-[var(--muted)] mt-1 truncate w-full">
                                                        {inv.invoiceNumber ? `#${inv.invoiceNumber} • ` : ''}{isReceived ? `From: ${inv.user?.businessName || inv.user?.name || 'Unknown'}` : `To: ${inv.clientName || 'No Client'}`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="font-mono text-base font-semibold text-[#111827] dark:text-white">
                                                    ${inv.total.toFixed(2)}
                                                </span>
                                                <div className="relative">
                                                    {!isReceived && (
                                                        <InvoiceActions 
                                                            invoice={{ 
                                                                id: inv.id, 
                                                                status: inv.status, 
                                                                isConverted: inv.isConverted, 
                                                                publicToken: inv.publicToken, 
                                                                convertedReceiptId: inv.convertedReceiptId,
                                                                acceptOnlinePayment: inv.acceptOnlinePayment,
                                                                paymentStatus: inv.paymentStatus,
                                                                remainingBalance: inv.remainingBalance
                                                            }} 
                                                            isPro={isPro}
                                                            trigger={
                                                                <button className="w-7 h-7 rounded-[7px] bg-[#F4F5F9] dark:bg-gray-800 hover:bg-[#E2E6F3] dark:hover:bg-gray-700 flex items-center justify-center transition-colors text-[#6B7280] dark:text-[var(--muted)] mt-0.5">
                                                                    <IconDotsVertical className="w-4 h-4" />
                                                                </button>
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-[#F0F1FA] dark:border-[var(--border)] flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase", pillBg, pillColor)}>
                                                    {displayStatus}
                                                </span>
                                                <div className="flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF] dark:text-[var(--muted)]">
                                                    <IconClock className="w-3 h-3" stroke={2} />
                                                    {formatDistanceToNow(new Date(inv.lastActivityAt), { addSuffix: true })}
                                                </div>
                                            </div>

                                            <div>
                                                {inv.status === 'PAID' ? (
                                                    <Link href={inv.convertedReceiptId ? `/receipt/${inv.convertedReceiptId}` : `/history`} className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors">
                                                        View
                                                    </Link>
                                                ) : isReceived ? (
                                                    <Link href={`/invoice/${inv.publicToken}`} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md shadow-indigo-500/20">
                                                        Pay Online
                                                    </Link>
                                                ) : isOverdue ? (
                                                    <Link href={`/dashboard/invoices/edit/${inv.id}`} className="px-4 py-1.5 bg-[#A32D2D] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-red-900/20">
                                                        Remind
                                                    </Link>
                                                ) : (
                                                    <Link href={`/dashboard/invoices/edit/${inv.id}`} className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors">
                                                        Edit
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


```


## src\app\dashboard\invoices\aging\page.tsx
```tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function InvoiceAgingDashboard() {
    const [buckets, setBuckets] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/invoices/aging')
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setBuckets(data.buckets);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const copyLink = (token: string) => {
        const link = `${window.location.origin}/portal/invoice/${token}?src=copy`;
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


```


## src\app\dashboard\invoices\create\page.tsx
```tsx

import InvoiceWizard from '@/components/invoices/InvoiceWizard';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        redirect('/login');
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";
    
    if (!isPro) {
        redirect('/dashboard/invoices');
    }

    const userRecord = await db.user.findUnique({
        where: { id: authUser.userId },
        select: { businessName: true, businessLogoPath: true, businessRegistrationNumber: true, email: true }
    });

    const globalProfile = await db.businessProfile.findFirst();

    return (
        <div className="min-h-screen bg-[var(--bg)] pt-8 pb-32">
            <InvoiceWizard 
                isPro={isPro} 
                businessName={userRecord?.businessName || userRecord?.email?.split('@')[0] || globalProfile?.businessName || undefined}
                businessLogoPath={userRecord?.businessLogoPath || globalProfile?.logoPath || undefined}
                businessRegistrationNumber={userRecord?.businessRegistrationNumber || globalProfile?.businessRegistrationNumber || undefined}
            />
        </div>
    );
}


```


## src\app\dashboard\invoices\edit\[id]\page.tsx
```tsx

import InvoiceWizard from '@/components/invoices/InvoiceWizard';
import InvoiceActivityLog from '@/components/invoices/InvoiceActivityLog';
import PaymentPlanManager from '@/components/invoices/PaymentPlanManager';
import PaymentInsightsCard from '@/components/invoices/PaymentInsightsCard';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        redirect('/login');
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";
    
    if (!isPro) {
        redirect('/dashboard/invoices');
    }

    const invoice = await db.invoice.findUnique({
        where: { id },
        include: { 
            items: true,
            installments: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!invoice || invoice.userId !== authUser.userId || invoice.isConverted) {
        redirect('/dashboard/invoices');
    }

    // Adapt to wizard props
    const initialData = {
        id: invoice.id,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail || '',
        clientCompany: invoice.clientCompany || '',
        clientPhone: invoice.clientPhone || '',
        clientAddress: invoice.clientAddress || '',
        clientPropertyAddress: invoice.clientPropertyAddress || '',
        title: invoice.title,
        description: invoice.description || '',
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : '',
        notes: invoice.notes || '',
        attachedPhotos: invoice.attachedPhotos ? (invoice.attachedPhotos as string[]) : undefined,
        tax: invoice.tax || 0,
        depositAmount: invoice.depositAmount || 0,
        paymentMethod: invoice.paymentMethod || '',
        payments: invoice.payments ? (invoice.payments as any) : undefined,
        discountType: invoice.discountType || "none",
        discountValue: invoice.discountValue || 0,
        status: invoice.status,
        items: invoice.items.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice
        }))
    };

    const userRecord = await db.user.findUnique({
        where: { id: authUser.userId },
        select: { businessName: true, businessLogoPath: true, businessRegistrationNumber: true, email: true }
    });

    const globalProfile = await db.businessProfile.findFirst();

    return (
        <div className="min-h-screen bg-[var(--bg)] pt-8 pb-32">
            <InvoiceWizard 
                isPro={isPro} 
                businessName={userRecord?.businessName || userRecord?.email?.split('@')[0] || globalProfile?.businessName || undefined}
                businessLogoPath={userRecord?.businessLogoPath || globalProfile?.logoPath || undefined}
                businessRegistrationNumber={userRecord?.businessRegistrationNumber || globalProfile?.businessRegistrationNumber || undefined}
                initialData={initialData} 
            />

            <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
                {isPro && (
                    <div className="mb-8">
                        <PaymentInsightsCard invoiceId={invoice.id} />
                    </div>
                )}
                
                {isPro && (
                    <PaymentPlanManager 
                        invoiceId={invoice.id}
                        invoiceTotal={invoice.total}
                        initialPlanEnabled={invoice.paymentPlanEnabled}
                        initialInstallments={invoice.installments.map(i => ({
                            id: i.id,
                            label: i.label,
                            amount: i.amount,
                            dueDate: i.dueDate ? i.dueDate.toISOString() : null,
                            status: i.status
                        }))}
                    />
                )}
                
                {/* Payment Request Activity Section */}
                {isPro && <InvoiceActivityLog invoiceId={invoice.id} />}
            </div>
        </div>
    );
}


```


## src\app\api\invoices\route.ts
```tsx

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const where: any = {
            OR: [
                { userId: user.userId },
                { paymentRequestLogs: { some: { recipientUserId: user.userId } } }
            ]
        };

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.issueDate = {};
            if (startDate) where.issueDate.gte = new Date(startDate);
            if (endDate) where.issueDate.lte = new Date(endDate);
        }

        const invoices = await prisma.invoice.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                items: true
            }
        });

        return NextResponse.json({ success: true, invoices }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Invoices Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\aging\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const owner = await db.user.findUnique({ where: { id: user.userId } });
        if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isPro = (owner.plan === 'PRO' && owner.planStatus !== 'inactive') || owner.role === 'ADMIN' || owner.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Invoice Aging is a Pro feature.' }, { status: 403 });
        }

        // Fetch unpaid and partial invoices
        const invoices = await db.invoice.findMany({
            where: {
                userId: user.userId,
                status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
                remainingBalance: { gt: 0 }
            },
            select: {
                id: true,
                invoiceNumber: true,
                title: true,
                clientName: true,
                clientEmail: true,
                total: true,
                amountPaid: true,
                remainingBalance: true,
                dueDate: true,
                status: true,
                paymentStatus: true,
                lastPaymentReminderAt: true,
                publicToken: true
            },
            orderBy: { dueDate: 'asc' }
        });

        const now = new Date();
        now.setHours(0,0,0,0);

        const buckets = {
            current: [] as any[],
            days1to15: [] as any[],
            days16to30: [] as any[],
            days31to60: [] as any[],
            days60Plus: [] as any[],
            noDueDate: [] as any[]
        };

        invoices.forEach(inv => {
            if (!inv.dueDate) {
                buckets.noDueDate.push(inv);
                return;
            }

            const dueDate = new Date(inv.dueDate);
            dueDate.setHours(0,0,0,0);

            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) buckets.current.push(inv);
            else if (diffDays <= 15) buckets.days1to15.push(inv);
            else if (diffDays <= 30) buckets.days16to30.push(inv);
            else if (diffDays <= 60) buckets.days31to60.push(inv);
            else buckets.days60Plus.push(inv);
        });

        return NextResponse.json({ success: true, buckets });
    } catch (error) {
        console.error('Aging API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\create\route.ts
```tsx

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getNextSequenceData } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { customerContactId, clientName, clientEmail, clientCompany, clientPhone, clientAddress, clientPropertyAddress, title, description, currency, tax, discountType, discountValue, issueDate, dueDate, notes, attachedPhotos, items, depositAmount, paymentMethod, payments } = body;

        if (!clientName || !title || !issueDate || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields or items' }, { status: 400 });
        }

        // Server-Side Math Calculation (Never trust client)
        let calculatedSubtotal = 0;
        const processedItems = items.map((item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const lineTotal = qty * price;
            calculatedSubtotal += lineTotal;
            
            return {
                name: item.name || "Item",
                description: item.description || null,
                quantity: qty,
                unitPrice: price,
                total: lineTotal
            };
        });

        // Discount Validation
        let calculatedDiscount = 0;
        const dT = discountType || "none";
        const dV = Number(discountValue) || 0;

        if (dT === "percent") {
            calculatedDiscount = calculatedSubtotal * (dV / 100);
        } else if (dT === "flat") {
            calculatedDiscount = dV;
        }

        const subtotalAfterDiscount = Math.max(0, calculatedSubtotal - calculatedDiscount);
        const calculatedTax = Number(tax) || 0;
        const calculatedTotal = subtotalAfterDiscount + calculatedTax;

        // Generate Document Sequence Number
        const seqData = await getNextSequenceData(user.userId, 'INVOICE');

        // Generate safe 30-day URL Token
        const tokenValue = crypto.randomUUID();
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const invoice = await prisma.invoice.create({
            data: {
                userId: user.userId,
                customerContactId: customerContactId || null,
                invoiceNumber: seqData.documentNumber,
                sequenceNumber: seqData.sequenceNumber,
                clientName,
                clientEmail: clientEmail || null,
                clientCompany: clientCompany || null,
                clientPhone: clientPhone || null,
                clientAddress: clientAddress || null,
                clientPropertyAddress: clientPropertyAddress || null,
                title,
                description: description || null,
                currency: currency || "USD",
                depositAmount: Number(depositAmount) || 0,
                paymentMethod: paymentMethod || null,
                payments: payments && Array.isArray(payments) ? payments : undefined,
                discountType: dT,
                discountValue: dV,
                subtotal: calculatedSubtotal,
                tax: calculatedTax,
                total: calculatedTotal,
                issueDate: new Date(issueDate),
                dueDate: dueDate ? new Date(dueDate) : null,
                notes: notes || null,
                attachedPhotos: attachedPhotos && Array.isArray(attachedPhotos) ? attachedPhotos : undefined,
                status: body.status === 'SENT' ? 'SENT' : 'DRAFT',
                sentAt: body.status === 'SENT' ? new Date() : null,
                publicToken: tokenValue,
                publicTokenExpiresAt: expirationDate,
                items: {
                    create: processedItems
                }
            },
            include: {
                items: true
            }
        });

        revalidatePath('/dashboard/invoices');
        return NextResponse.json({ success: true, invoice }, { status: 201 });
    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\route.ts
```tsx

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        return NextResponse.json({ success: true, invoice }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Cannot update a converted invoice' }, { status: 400 });
        }

        const body = await req.json();
        const { customerContactId, clientName, clientEmail, clientCompany, clientPhone, clientAddress, clientPropertyAddress, title, description, currency, tax, discountType, discountValue, issueDate, dueDate, notes, status, attachedPhotos, items, depositAmount, paymentMethod, payments, acceptOnlinePayment } = body;

        let dataToUpdate: any = {};
        
        if (customerContactId !== undefined) dataToUpdate.customerContactId = customerContactId || null;

        if (clientName !== undefined) dataToUpdate.clientName = clientName;
        if (clientEmail !== undefined) dataToUpdate.clientEmail = clientEmail || null;
        if (clientCompany !== undefined) dataToUpdate.clientCompany = clientCompany || null;
        if (clientPhone !== undefined) dataToUpdate.clientPhone = clientPhone || null;
        if (clientAddress !== undefined) dataToUpdate.clientAddress = clientAddress || null;
        if (clientPropertyAddress !== undefined) dataToUpdate.clientPropertyAddress = clientPropertyAddress || null;
        if (title !== undefined) dataToUpdate.title = title;
        if (description !== undefined) dataToUpdate.description = description || null;
        if (currency !== undefined) dataToUpdate.currency = currency || "USD";
        if (issueDate !== undefined) dataToUpdate.issueDate = new Date(issueDate);
        if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
        if (notes !== undefined) dataToUpdate.notes = notes || null;
        if (status !== undefined) {
            const STATUS_RANKS: Record<string, number> = { CANCELLED: -1, DRAFT: 0, SENT: 1, VIEWED: 2, PAID: 3 };
            const currentRank = STATUS_RANKS[invoice.status] ?? 0;
            const newRank = STATUS_RANKS[status] ?? 0;

            // Prevent backward status transitions. PAID is terminal. CANCELLED is allowed unless PAID.
            if (status === 'CANCELLED' && invoice.status !== 'PAID') {
                dataToUpdate.status = status;
            } else if (newRank >= currentRank) {
                dataToUpdate.status = status;
                if (status === 'SENT' && invoice.status !== 'SENT' && !invoice.sentAt) {
                    dataToUpdate.sentAt = new Date();
                }
            }
        }

        if (discountType !== undefined) dataToUpdate.discountType = discountType;
        if (discountValue !== undefined) dataToUpdate.discountValue = Number(discountValue) || 0;
        if (depositAmount !== undefined) dataToUpdate.depositAmount = Number(depositAmount) || 0;
        if (paymentMethod !== undefined) dataToUpdate.paymentMethod = paymentMethod || null;
        if (payments !== undefined && Array.isArray(payments)) dataToUpdate.payments = payments;
        
        if (acceptOnlinePayment !== undefined) {
            const isPro = (user.plan === "PRO" && user.planStatus !== "inactive") || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
            if (!isPro && acceptOnlinePayment === true) {
                return NextResponse.json({ success: false, error: 'Pro plan required to enable online payments.' }, { status: 403 });
            }
            dataToUpdate.acceptOnlinePayment = acceptOnlinePayment;
            if (acceptOnlinePayment && !invoice.paymentEnabledAt) {
                dataToUpdate.paymentEnabledAt = new Date();
            }
        }
        
        if (attachedPhotos !== undefined && Array.isArray(attachedPhotos)) dataToUpdate.attachedPhotos = attachedPhotos;

        // Handle mathematical items payload enforcement
        if (items && Array.isArray(items)) {
            let calculatedSubtotal = 0;
            const newItems = items.map((item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const lineTotal = qty * price;
                calculatedSubtotal += lineTotal;
                return {
                    name: item.name || "Item",
                    description: item.description || null,
                    quantity: qty,
                    unitPrice: price,
                    total: lineTotal
                };
            });

            let activeDiscountType = dataToUpdate.discountType ?? invoice.discountType;
            let activeDiscountValue = dataToUpdate.discountValue !== undefined ? dataToUpdate.discountValue : invoice.discountValue;

            let calculatedDiscount = 0;
            if (activeDiscountType === "percent") {
                calculatedDiscount = calculatedSubtotal * ((activeDiscountValue || 0) / 100);
            } else if (activeDiscountType === "flat") {
                calculatedDiscount = activeDiscountValue || 0;
            }

            const subtotalAfterDiscount = Math.max(0, calculatedSubtotal - calculatedDiscount);
            const calculatedTax = tax !== undefined ? Number(tax) : Number(invoice.tax || 0);
            const calculatedTotal = subtotalAfterDiscount + calculatedTax;

            dataToUpdate.subtotal = calculatedSubtotal;
            dataToUpdate.tax = calculatedTax;
            dataToUpdate.total = calculatedTotal;

            // Delete old items and replace with new ones
            await prisma.invoiceLineItem.deleteMany({
                where: { invoiceId: invoice.id }
            });
            
            dataToUpdate.items = {
                create: newItems
            };
        } else if (tax !== undefined) {
             // Only updating tax without items
             const currentSubtotal = invoice.subtotal;
             const newTax = Number(tax);
             dataToUpdate.tax = newTax;
             dataToUpdate.total = currentSubtotal + newTax;
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: dataToUpdate,
            include: { items: true }
        });

        revalidatePath('/dashboard/invoices');
        return NextResponse.json({ success: true, invoice: updatedInvoice }, { status: 200 });

    } catch (error: any) {
        console.error('Update Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Cannot delete a converted invoice' }, { status: 400 });
        }
        if (invoice.status === 'PAID') {
            return NextResponse.json({ success: false, error: 'Cannot delete a PAID invoice' }, { status: 400 });
        }

        await prisma.invoice.delete({
            where: { id: invoice.id }
        });

        revalidatePath('/dashboard/invoices');
        return NextResponse.json({ success: true, deletedId: invoice.id }, { status: 200 });
    } catch (error: any) {
        console.error('Delete Invoice Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\activity\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const invoice = await db.invoice.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const logs = await db.invoicePaymentRequestLog.findMany({
            where: { invoiceId: id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return NextResponse.json({ logs });

    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\convert\route.ts
```tsx

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

import { convertInvoiceToReceipt } from '@/lib/invoices/convertInvoiceToReceipt';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        // 1. Fetch the invoice to verify ownership
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        // 2. Perform conversion
        const result = await convertInvoiceToReceipt(id);
        
        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error || 'Conversion failed' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            receiptId: result.receiptId, 
            invoiceId: result.invoiceId 
        }, { status: 200 });

    } catch (error: any) {
        console.error('Invoice Conversion Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\generate-token\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tokenString = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!tokenString) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(tokenString);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const invoice = await db.invoice.findFirst({
            where: { id, userId: user.userId }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found or unauthorized' }, { status: 404 });
        }

        if (invoice.publicToken) {
            return NextResponse.json({ success: true, token: invoice.publicToken });
        }

        const newToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.invoice.update({
            where: { id },
            data: {
                publicToken: newToken,
                publicTokenExpiresAt: expiresAt
            }
        });

        return NextResponse.json({ success: true, token: newToken });

    } catch (error) {
        console.error('Generate token error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\installments\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const sender = await db.user.findUnique({ where: { id: user.userId } });
        const isPro = (sender?.plan === 'PRO' && sender?.planStatus !== 'inactive') || sender?.role === 'ADMIN' || sender?.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Payment plans are a Pro feature.' }, { status: 403 });
        }

        const invoice = await db.invoice.findUnique({
            where: { id },
            include: { installments: true }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot modify payment plan for a fully paid invoice' }, { status: 400 });

        const body = await request.json();
        const { paymentPlanEnabled, installments } = body;

        // If disabling the plan, check if any installments are already paid
        if (!paymentPlanEnabled) {
            const hasPaidInstallments = invoice.installments.some(inst => inst.status === 'PAID');
            if (hasPaidInstallments) {
                return NextResponse.json({ error: 'Cannot disable payment plan because some installments are already paid.' }, { status: 400 });
            }

            // Safe to delete all and disable
            await db.$transaction([
                db.invoiceInstallment.deleteMany({ where: { invoiceId: id } }),
                db.invoice.update({ where: { id }, data: { paymentPlanEnabled: false } })
            ]);

            return NextResponse.json({ success: true, installments: [] });
        }

        // Validate installments
        if (!Array.isArray(installments) || installments.length === 0) {
            return NextResponse.json({ error: 'Installments array cannot be empty when plan is enabled.' }, { status: 400 });
        }

        const sumOfInstallments = installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0);
        // We compare to invoice total. If they've already paid some non-installment amount, we might need to handle differently, 
        // but typically installments should sum to invoice total.
        const EPSILON = 0.01;
        if (Math.abs(sumOfInstallments - invoice.total) > EPSILON) {
            return NextResponse.json({ error: `Sum of installments ($${sumOfInstallments.toFixed(2)}) must equal invoice total ($${invoice.total.toFixed(2)}).` }, { status: 400 });
        }

        // We will process this in a transaction:
        // 1. Update existing unpaid installments, or delete removed unpaid ones.
        // 2. Create new installments.
        // 3. Keep PAID ones completely untouched.

        const existingInstallments = invoice.installments;
        const paidInstallmentIds = existingInstallments.filter(i => i.status === 'PAID').map(i => i.id);

        const incomingIds = installments.map(i => i.id).filter(Boolean);

        // Make sure no paid installment was removed or modified in amount
        for (const paidId of paidInstallmentIds) {
            const match = installments.find(i => i.id === paidId);
            if (!match) return NextResponse.json({ error: 'Cannot remove a paid installment.' }, { status: 400 });
            const original = existingInstallments.find(i => i.id === paidId);
            if (original && Math.abs(Number(match.amount) - Number(original.amount)) > EPSILON) {
                return NextResponse.json({ error: 'Cannot change the amount of a paid installment.' }, { status: 400 });
            }
        }

        // Find which existing unpaid ones to delete
        const toDeleteIds = existingInstallments
            .filter(i => i.status !== 'PAID' && !incomingIds.includes(i.id))
            .map(i => i.id);

        await db.$transaction(async (tx) => {
            // Delete removed unpaid installments
            if (toDeleteIds.length > 0) {
                await tx.invoiceInstallment.deleteMany({ where: { id: { in: toDeleteIds } } });
            }

            // Upsert incoming installments
            for (const inst of installments) {
                if (inst.id && existingInstallments.some(e => e.id === inst.id)) {
                    // Update (only if not paid, or if paid we only allow label/dueDate changes conceptually, but let's be safe)
                    const existing = existingInstallments.find(e => e.id === inst.id);
                    if (existing?.status !== 'PAID') {
                        await tx.invoiceInstallment.update({
                            where: { id: inst.id },
                            data: {
                                label: inst.label || null,
                                amount: Number(inst.amount),
                                dueDate: inst.dueDate ? new Date(inst.dueDate) : null
                            }
                        });
                    } else {
                        // Allow updating label and due date for paid items, but strictly ignore amount changes
                        await tx.invoiceInstallment.update({
                            where: { id: inst.id },
                            data: {
                                label: inst.label || null,
                                dueDate: inst.dueDate ? new Date(inst.dueDate) : null
                            }
                        });
                    }
                } else {
                    // Create new
                    await tx.invoiceInstallment.create({
                        data: {
                            invoiceId: id,
                            label: inst.label || null,
                            amount: Number(inst.amount),
                            dueDate: inst.dueDate ? new Date(inst.dueDate) : null
                        }
                    });
                }
            }

            // Enable plan
            await tx.invoice.update({
                where: { id },
                data: { paymentPlanEnabled: true }
            });
        });

        // Fetch the fresh list to return
        const freshInstallments = await db.invoiceInstallment.findMany({
            where: { invoiceId: id },
            orderBy: { createdAt: 'asc' } // Or by due date
        });

        return NextResponse.json({ success: true, installments: freshInstallments });

    } catch (error: any) {
        console.error('Failed to update installments:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\log-link-copy\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        // Throttle copying logs to once per hour to prevent spamming the activity log if the user clicks copy 10 times.
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentLog = await db.invoicePaymentRequestLog.findFirst({
            where: {
                invoiceId: id,
                channel: 'COPY_LINK',
                action: 'LINK_COPIED',
                createdAt: { gte: oneHourAgo }
            }
        });

        if (!recentLog) {
            await db.invoicePaymentRequestLog.create({
                data: {
                    invoiceId: id,
                    channel: 'COPY_LINK',
                    action: 'LINK_COPIED',
                    status: 'SENT'
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to log link copy:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\mark-paid\route.ts
```tsx

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Cannot mark converted invoice as paid' }, { status: 400 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: { 
                status: 'PAID',
                paymentStatus: 'PAID',
                paymentConfirmed: true,
                paymentConfirmedAt: new Date(),
                amountPaid: invoice.total,
                remainingBalance: 0,
                lastPaymentAt: new Date()
            },
            include: { items: true }
        });

        // Resolve any active installments to avoid conflicts
        if (invoice.paymentPlanEnabled) {
            await prisma.invoiceInstallment.updateMany({
                where: { invoiceId: invoice.id, status: { not: 'PAID' } },
                data: { status: 'PAID', paidAt: new Date() }
            });
        }

        return NextResponse.json({ success: true, invoice: updatedInvoice }, { status: 200 });

    } catch (error: any) {
        console.error('Mark Paid Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\payment-insights\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const invoice = await db.invoice.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                status: true,
                paymentStatus: true,
                amountPaid: true,
                remainingBalance: true,
                total: true,
                viewCount: true,
                lastViewedAt: true,
                paymentReminderCount: true,
                lastPaymentReminderAt: true,
                user: { select: { plan: true, role: true, planStatus: true } }
            }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const isPro = (invoice.user?.plan === 'PRO' && invoice.user?.planStatus !== 'inactive') || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Insights are a Pro feature.' }, { status: 403 });
        }

        const events = await db.invoicePaymentAnalyticsEvent.findMany({
            where: { invoiceId: id }
        });

        const insights = {
            totalViews: invoice.viewCount || 0,
            portalViews: events.filter(e => e.eventType === 'PORTAL_VIEW').length,
            ctaClicks: events.filter(e => e.eventType === 'PAYMENT_CTA_CLICK' || e.eventType === 'INSTALLMENT_CTA_CLICK').length,
            bundleViews: events.filter(e => e.eventType === 'BUNDLE_VIEW').length,
            lastViewedAt: invoice.lastViewedAt,
            reminderCount: invoice.paymentReminderCount || 0,
            lastReminderAt: invoice.lastPaymentReminderAt,
            remainingBalance: invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0)),
            status: invoice.status,
            conversionState: 'UNSEEN'
        };

        if (invoice.status === 'PAID' || invoice.paymentStatus === 'PAID') {
            insights.conversionState = 'PAID';
        } else if ((invoice.amountPaid || 0) > 0) {
            insights.conversionState = 'PARTIAL_PAID';
        } else if (insights.ctaClicks > 0) {
            insights.conversionState = 'CLICKED_UNPAID';
        } else if (insights.totalViews > 0 || insights.portalViews > 0) {
            insights.conversionState = 'VIEWED_UNPAID';
        }

        return NextResponse.json({ success: true, insights });
    } catch (error) {
        console.error('Insights API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\send-payment-email\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendInvoicePaymentEmail } from '@/lib/email';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { email, message, enableOnlinePayment } = body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
        }

        // 1. Verify Sender is Pro/Admin
        const sender = await db.user.findUnique({
            where: { id: user.userId }
        });
        if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isPro = (sender.plan === 'PRO' && sender.planStatus !== 'inactive') || sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Email payment requests are a Pro feature.' }, { status: 403 });
        }

        // 2. Fetch and Validate Invoice
        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot request payment for a fully paid invoice' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot request payment for a cancelled invoice' }, { status: 400 });
        
        const remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
        if (remainingBalance <= 0) return NextResponse.json({ error: 'Invoice has no remaining balance' }, { status: 400 });

        // Enable online payments if requested
        if (!invoice.acceptOnlinePayment) {
            if (enableOnlinePayment) {
                await db.invoice.update({
                    where: { id },
                    data: { acceptOnlinePayment: true }
                });
                invoice.acceptOnlinePayment = true;
            } else {
                return NextResponse.json({ error: 'Online payments must be enabled to send a payment request link.' }, { status: 400 });
            }
        }

        // 3. Generate Public Token if missing
        let publicToken = invoice.publicToken;
        if (!publicToken) {
            const { randomBytes } = await import('crypto');
            publicToken = randomBytes(32).toString('hex');
            await db.invoice.update({
                where: { id },
                data: { publicToken }
            });
        }

        // 4. Rate Limiting Check
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentLog = await db.invoicePaymentRequestLog.findFirst({
            where: {
                invoiceId: id,
                channel: 'EMAIL',
                action: 'REQUEST_SENT',
                recipientEmail: email,
                createdAt: { gte: fifteenMinsAgo }
            }
        });

        if (recentLog) {
            return NextResponse.json({ error: 'An email request was already sent to this address recently. Please wait 15 minutes.' }, { status: 429 });
        }

        // 5. Generate Request Log ID beforehand for tracking
        const { createId } = await import('@paralleldrive/cuid2');
        const requestLogId = createId();

        const businessName = sender.businessName || sender.name || sender.email?.split('@')[0] || 'A business';
        const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app'}/portal/invoice/${publicToken}?src=email&rid=${requestLogId}`;
        
        const emailSent = await sendInvoicePaymentEmail({
            to: email,
            businessName,
            invoiceNumber: invoice.invoiceNumber || invoice.title,
            remainingBalance,
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
            paymentLink,
            customMessage: message?.trim()
        });

        if (!emailSent) {
            // Log Failure
            await db.invoicePaymentRequestLog.create({
                data: {
                    id: requestLogId,
                    invoiceId: id,
                    channel: 'EMAIL',
                    recipientEmail: email,
                    action: 'REQUEST_SENT',
                    status: 'FAILED'
                }
            });
            return NextResponse.json({ error: 'Email service is not configured or failed to send.' }, { status: 500 });
        }

        // 6. Log Success
        await db.invoicePaymentRequestLog.create({
            data: {
                id: requestLogId,
                invoiceId: id,
                channel: 'EMAIL',
                recipientEmail: email,
                action: 'REQUEST_SENT',
                status: 'SENT'
            }
        });

        if (invoice.customerContactId) {
            await db.customerCommunicationLog.create({
                data: {
                    ownerId: user.userId,
                    customerContactId: invoice.customerContactId,
                    channel: 'EMAIL',
                    direction: 'OUTBOUND',
                    subject: 'Invoice Payment Request',
                    contentPreview: message?.trim() || `Requested payment for invoice ${invoice.invoiceNumber || invoice.title}`,
                    relatedInvoiceId: id,
                    status: 'SENT'
                }
            });
        }

        // Update invoice status if draft
        if (invoice.status === 'DRAFT') {
            await db.invoice.update({
                where: { id },
                data: { status: 'SENT', sentAt: new Date() }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to send email request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\send-payment-reminder\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendInvoiceReminderEmail } from '@/lib/email';
import { sendNativePush } from '@/lib/push';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { channel, email, recipientUserId, message, installmentId } = body;

        if (!['EMAIL', 'NETWORK'].includes(channel)) {
            return NextResponse.json({ error: 'Invalid channel specified.' }, { status: 400 });
        }

        if (channel === 'EMAIL' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
            return NextResponse.json({ error: 'A valid recipient email is required for email reminders.' }, { status: 400 });
        }

        if (channel === 'NETWORK' && !recipientUserId) {
            return NextResponse.json({ error: 'Recipient User ID is required for network reminders.' }, { status: 400 });
        }

        // 1. Verify Sender is Pro/Admin
        const sender = await db.user.findUnique({
            where: { id: user.userId }
        });
        if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isPro = (sender.plan === 'PRO' && sender.planStatus !== 'inactive') || sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Payment reminders are a Pro feature.' }, { status: 403 });
        }

        // 2. Fetch and Validate Invoice
        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot send reminder for a fully paid invoice' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot send reminder for a cancelled invoice' }, { status: 400 });
        if (!invoice.acceptOnlinePayment) return NextResponse.json({ error: 'Online payments must be enabled to send a reminder.' }, { status: 400 });
        
        let remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
        if (remainingBalance <= 0) return NextResponse.json({ error: 'Invoice has no remaining balance' }, { status: 400 });

        let installmentLabel = '';
        let installmentAmount = 0;
        if (installmentId && invoice.paymentPlanEnabled) {
            const installment = await db.invoiceInstallment.findUnique({ where: { id: installmentId } });
            if (!installment || installment.invoiceId !== id) {
                return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
            }
            if (installment.status === 'PAID') {
                return NextResponse.json({ error: 'This installment is already paid.' }, { status: 400 });
            }
            installmentLabel = installment.label || 'installment';
            installmentAmount = installment.amount;
        }

        let publicToken = invoice.publicToken;
        if (!publicToken) {
            const { randomBytes } = await import('crypto');
            publicToken = randomBytes(32).toString('hex');
            await db.invoice.update({ where: { id }, data: { publicToken } });
        }

        // 3. Reminder Cooldown Check
        // Max 1 reminder per channel/recipient per 24 hours.
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const whereClause: any = {
            invoiceId: id,
            channel,
            action: 'REMINDER_SENT',
            status: 'SENT',
            createdAt: { gte: oneDayAgo }
        };
        if (channel === 'EMAIL') whereClause.recipientEmail = email;
        if (channel === 'NETWORK') whereClause.recipientUserId = recipientUserId;

        const recentReminder = await db.invoicePaymentRequestLog.findFirst({ where: whereClause });

        if (recentReminder) {
            await db.invoicePaymentRequestLog.create({
                data: {
                    invoiceId: id,
                    channel,
                    recipientEmail: email,
                    recipientUserId,
                    action: 'REMINDER_SENT',
                    status: 'BLOCKED'
                }
            });
            return NextResponse.json({ error: 'A reminder was already sent recently. Try again later.' }, { status: 429 });
        }

        // Max 3 reminders total per 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentWeeklyCount = await db.invoicePaymentRequestLog.count({
            where: {
                invoiceId: id,
                action: 'REMINDER_SENT',
                status: 'SENT',
                createdAt: { gte: sevenDaysAgo }
            }
        });

        if (recentWeeklyCount >= 3) {
             return NextResponse.json({ error: 'Maximum weekly reminder limit reached (3). Try again later.' }, { status: 429 });
        }

        // 4. Generate Request Log ID beforehand for tracking
        const { createId } = await import('@paralleldrive/cuid2');
        const requestLogId = createId();

        const businessName = sender.businessName || sender.name || sender.email?.split('@')[0] || 'A business';
        const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app'}/portal/invoice/${publicToken}?src=${channel === 'EMAIL' ? 'email_reminder' : 'network_reminder'}&rid=${requestLogId}`;
        
        let conversationId = null;
        let messageId = null;

        if (channel === 'EMAIL') {
            let customNote = message?.trim();
            if (installmentId) {
                const prefix = `Reminder for ${installmentLabel} ($${installmentAmount.toFixed(2)})`;
                customNote = customNote ? `${prefix} - ${customNote}` : prefix;
            }

            const emailSent = await sendInvoiceReminderEmail({
                to: email,
                businessName,
                invoiceNumber: invoice.invoiceNumber || invoice.title,
                remainingBalance: installmentId ? installmentAmount : remainingBalance,
                dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
                paymentLink,
                customMessage: customNote
            });

            if (!emailSent) {
                await db.invoicePaymentRequestLog.create({
                    data: { id: requestLogId, invoiceId: id, channel, recipientEmail: email, action: 'REMINDER_SENT', status: 'FAILED' }
                });
                return NextResponse.json({ error: 'Email service is not configured or failed to send.' }, { status: 500 });
            }
        } else if (channel === 'NETWORK') {
            // Must have existing connection
            const connection = await db.connection.findFirst({
                where: {
                    status: 'ACCEPTED',
                    OR: [
                        { requesterId: user.userId, receiverId: recipientUserId },
                        { requesterId: recipientUserId, receiverId: user.userId }
                    ]
                }
            });

            if (!connection) return NextResponse.json({ error: 'Recipient is not in your accepted network' }, { status: 403 });

            let conversation = await db.conversation.findFirst({
                where: {
                    AND: [
                        { participants: { some: { userId: user.userId } } },
                        { participants: { some: { userId: recipientUserId } } },
                    ]
                }
            });

            if (!conversation) return NextResponse.json({ error: 'No conversation history found for this network user.' }, { status: 400 });
            conversationId = conversation.id;

            const metadata = {
                invoiceId: invoice.id,
                invoiceToken: publicToken,
                invoiceNumber: invoice.invoiceNumber || invoice.title,
                businessName: businessName,
                total: invoice.total,
                amountPaid: invoice.amountPaid || 0,
                remainingBalance: remainingBalance,
                paymentStatus: invoice.paymentStatus,
                sentAt: new Date().toISOString(),
                isReminder: true,
                installmentId: installmentId || null,
                installmentLabel: installmentLabel || null
            };

            const chatContent = installmentId 
                ? `[rem:${invoice.id}] Sent a payment reminder for ${installmentLabel} ($${installmentAmount.toFixed(2)}) on Invoice #${invoice.invoiceNumber || invoice.title}`
                : `[rem:${invoice.id}] Sent a payment reminder for Invoice #${invoice.invoiceNumber || invoice.title}`;

            const chatMessage = await db.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: user.userId,
                    content: chatContent,
                    type: 'INVOICE_PAYMENT_REQUEST', // Re-using card renderer
                    metadata: metadata
                }
            });
            messageId = chatMessage.id;

            await db.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

            const recipient = await db.user.findUnique({ where: { id: recipientUserId }, select: { notifyMessages: true } });
            if (recipient?.notifyMessages) {
                const notification = await db.notification.create({
                    data: {
                        userId: recipientUserId,
                        type: 'MESSAGE_RECEIVED',
                        title: 'Invoice Payment Reminder',
                        message: `${businessName} sent you a reminder for Invoice #${invoice.invoiceNumber || invoice.title}.`,
                        link: `/dashboard/messages/${conversation.id}`,
                        read: false
                    }
                });

                const userDevices = await db.pushToken.findMany({ where: { userId: recipientUserId } });
                const tokens = userDevices.map(d => d.token);
                if (tokens.length > 0) {
                    await sendNativePush(tokens, { title: notification.title, body: notification.message, data: { route: notification.link || '/' } });
                }
            }
        }

        // 5. Log Success
        await db.invoicePaymentRequestLog.create({
            data: {
                id: requestLogId,
                invoiceId: id,
                channel,
                recipientEmail: email,
                recipientUserId,
                conversationId,
                messageId,
                action: 'REMINDER_SENT',
                status: 'SENT',
                metadata: installmentId ? { installmentId, installmentLabel, installmentAmount } : {}
            }
        });

        if (invoice.customerContactId) {
            await db.customerCommunicationLog.create({
                data: {
                    ownerId: user.userId,
                    customerContactId: invoice.customerContactId,
                    channel: channel === 'NETWORK' ? 'NETWORK' : 'EMAIL',
                    direction: 'OUTBOUND',
                    subject: 'Invoice Payment Reminder',
                    contentPreview: message?.trim() || (installmentId ? `Reminder for ${installmentLabel}` : `Payment reminder for invoice ${invoice.invoiceNumber || invoice.title}`),
                    relatedInvoiceId: id,
                    status: 'SENT'
                }
            });
        }

        // 6. Update Invoice fields
        await db.invoice.update({
            where: { id },
            data: {
                lastPaymentReminderAt: new Date(),
                paymentReminderCount: { increment: 1 }
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to send payment reminder:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\app\api\invoices\[id]\send-payment-request\route.ts
```tsx

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';
import { sendNativePush } from '@/lib/push';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        try { await ensureActivated(user); } catch (e: any) { if (e.message === 'CORE_ACTIVATION_REQUIRED') return NextResponse.json({ error: 'Core activation required' }, { status: 403 }); throw e; }

        const body = await request.json();
        const { recipientUserId, enableOnlinePayment } = body;

        if (!recipientUserId) {
            return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
        }

        // 1. Verify Sender is Pro/Admin
        const sender = await db.user.findUnique({
            where: { id: user.userId }
        });
        if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isPro = (sender.plan === 'PRO' && sender.planStatus !== 'inactive') || sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN';
        if (!isPro) {
            return NextResponse.json({ error: 'Payment requests are a Pro feature.' }, { status: 403 });
        }

        // 2. Fetch and Validate Invoice
        const invoice = await db.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Cannot request payment for a fully paid invoice' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot request payment for a cancelled invoice' }, { status: 400 });
        
        const remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
        if (remainingBalance <= 0) return NextResponse.json({ error: 'Invoice has no remaining balance' }, { status: 400 });

        // Enable online payments if requested and not already enabled
        if (!invoice.acceptOnlinePayment) {
            if (enableOnlinePayment) {
                await db.invoice.update({
                    where: { id },
                    data: { acceptOnlinePayment: true }
                });
                invoice.acceptOnlinePayment = true;
            } else {
                return NextResponse.json({ error: 'Online payments must be enabled for this invoice before sending a payment request.' }, { status: 400 });
            }
        }

        // 3. Verify Recipient is an accepted connection
        const connection = await db.connection.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { requesterId: user.userId, receiverId: recipientUserId },
                    { requesterId: recipientUserId, receiverId: user.userId }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ error: 'Recipient is not in your accepted network' }, { status: 403 });
        }

        // 4. Generate/Retrieve Public Token
        let publicToken = invoice.publicToken;
        if (!publicToken) {
            const { randomBytes } = await import('crypto');
            publicToken = randomBytes(32).toString('hex');
            await db.invoice.update({
                where: { id },
                data: { publicToken }
            });
        }

        // 5. Find or Create Conversation
        let conversation = await db.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { userId: user.userId } } },
                    { participants: { some: { userId: recipientUserId } } },
                ]
            }
        });

        if (!conversation) {
            conversation = await db.conversation.create({
                data: {
                    participants: {
                        create: [
                            { userId: user.userId },
                            { userId: recipientUserId }
                        ]
                    }
                }
            });
        }

        // 5.5 Prevent Spam (No more than 1 request per invoice per conversation per 15 minutes)
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentRequest = await db.message.findFirst({
            where: {
                conversationId: conversation.id,
                type: 'INVOICE_PAYMENT_REQUEST',
                senderId: user.userId,
                createdAt: { gte: fifteenMinsAgo },
                // prisma JSON filtering isn't perfect for all DBs, so we filter by content or just any recent request from this sender for any invoice is fine, but specifically we could check metadata.
                content: { contains: invoice.id } // we can embed the invoice ID in the content to make it queryable.
            }
        });

        if (recentRequest) {
            return NextResponse.json({ error: 'You already sent a request for this invoice recently. Please wait 15 minutes before sending another.' }, { status: 429 });
        }

        // 6. Create Message with Metadata
        const { createId } = await import('@paralleldrive/cuid2');
        const requestLogId = createId();

        const businessName = sender.businessName || sender.name || sender.email?.split('@')[0] || 'A business';
        
        const metadata = {
            invoiceId: invoice.id,
            invoiceToken: publicToken,
            invoiceNumber: invoice.invoiceNumber || invoice.title,
            businessName: businessName,
            total: invoice.total,
            amountPaid: invoice.amountPaid || 0,
            remainingBalance: remainingBalance,
            paymentStatus: invoice.paymentStatus,
            sentAt: new Date().toISOString(),
            requestLogId: requestLogId
        };

        const message = await db.message.create({
            data: {
                conversationId: conversation.id,
                senderId: user.userId,
                content: `[req:${invoice.id}] Sent a payment request for Invoice #${invoice.invoiceNumber || invoice.title}`,
                type: 'INVOICE_PAYMENT_REQUEST',
                metadata: metadata
            }
        });

        await db.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() }
        });

        // 7. Send Notification to Recipient
        const recipient = await db.user.findUnique({
            where: { id: recipientUserId },
            select: { notifyMessages: true }
        });

        if (recipient?.notifyMessages) {
            const notification = await db.notification.create({
                data: {
                    userId: recipientUserId,
                    type: 'MESSAGE_RECEIVED',
                    title: 'New Payment Request',
                    message: `${businessName} sent you a payment request for Invoice #${invoice.invoiceNumber || invoice.title}.`,
                    link: `/dashboard/invoices`,
                    read: false
                }
            });

            // Send push notification if available
            const userDevices = await db.pushToken.findMany({
                where: { userId: recipientUserId }
            });
            const tokens = userDevices.map(d => d.token);
            if (tokens.length > 0) {
                await sendNativePush(tokens, {
                    title: notification.title,
                    body: notification.message,
                    data: { route: notification.link || '/' }
                });
            }
        }

        // 8. Log the activity
        await db.invoicePaymentRequestLog.create({
            data: {
                id: requestLogId,
                invoiceId: id,
                channel: 'NETWORK',
                recipientUserId,
                conversationId: conversation.id,
                messageId: message.id,
                action: 'REQUEST_SENT',
                status: 'SENT'
            }
        });

        // Update invoice status if draft
        if (invoice.status === 'DRAFT') {
            await db.invoice.update({
                where: { id },
                data: { status: 'SENT', sentAt: new Date() }
            });
        }

        return NextResponse.json({ success: true, messageId: message.id });

    } catch (error) {
        console.error('Failed to send payment request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


```


## src\components\invoices\CompactStatsGrid.tsx
```tsx

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


```


## src\components\invoices\CustomerPortalViewer.tsx
```tsx

'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Installment {
    id: string;
    label: string | null;
    amount: number;
    dueDate: string | null;
    status: string;
    paidAt: string | null;
}

interface CustomerPortalViewerProps {
    token: string;
    source?: string | null;
    requestLogId?: string | null;
}

export default function CustomerPortalViewer({ token, source, requestLogId }: CustomerPortalViewerProps) {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    useEffect(() => {
        async function fetchInvoice() {
            try {
                const res = await fetch(`/api/public/invoice/${token}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load portal');
                setInvoice(data.invoice);

                // Safely track the view
                fetch(`/api/public/invoice/${token}/track-payment-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: 'PORTAL_VIEW',
                        channel: source || 'PUBLIC',
                        requestLogId: requestLogId || null
                    })
                }).catch(() => {}); // Fire and forget
                
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchInvoice();
    }, [token, source, requestLogId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#030712]">
                <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#030712] p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Unavailable</h1>
                <p className="text-gray-500 dark:text-[var(--muted)] max-w-sm">{error || "This payment portal is not available."}</p>
            </div>
        );
    }

    const isFullyPaid = invoice.paymentStatus === 'PAID';
    const remainingBalance = invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0));

    const handleCheckout = async (installmentId?: string) => {
        setIsCheckoutLoading(true);
        try {
            // Track Click
            await fetch(`/api/public/invoice/${token}/track-payment-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: installmentId ? 'INSTALLMENT_CTA_CLICK' : 'PAYMENT_CTA_CLICK',
                    channel: source || 'PUBLIC',
                    requestLogId: requestLogId || null,
                    installmentId
                })
            }).catch(() => {});

            // Redirect to Stripe
            const res = await fetch(`/api/public/invoice/${token}/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installmentId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to initialize secure checkout.');
            }
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] font-sans text-[var(--text)] pb-24">
            {/* Header */}
            <header className="bg-white dark:bg-[#0b1220] border-b border-black/5 dark:border-white/10 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {invoice.businessLogoPath ? (
                            <img src={invoice.businessLogoPath} alt={invoice.businessName} className="h-10 w-auto rounded object-contain" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-lg">
                                {invoice.businessName?.charAt(0).toUpperCase() || 'B'}
                            </div>
                        )}
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white leading-tight">{invoice.businessName || 'Business'}</div>
                            <div className="text-xs text-gray-500 dark:text-[var(--muted)]">Payment Portal</div>
                        </div>
                    </div>
                    <div>
                        {isFullyPaid ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-full">Paid</span>
                        ) : remainingBalance < invoice.total ? (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-full">Partial</span>
                        ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 font-bold text-xs uppercase tracking-wider rounded-full">Unpaid</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
                
                {/* Balance Summary Card */}
                <section className={clsx("rounded-3xl p-8 shadow-xl relative overflow-hidden", isFullyPaid ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-600/20" : "bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-600/20")}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div>
                            <h2 className="text-indigo-100 dark:text-indigo-100 font-medium text-sm uppercase tracking-wider mb-2">
                                {isFullyPaid ? 'Invoice Settled' : 'Total Amount Due'}
                            </h2>
                            <div className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight">
                                ${remainingBalance.toFixed(2)}
                            </div>
                            <p className="mt-2 text-indigo-100/80 text-sm">
                                Invoice #{invoice.invoiceNumber || invoice.title} • Total: ${invoice.total.toFixed(2)}
                            </p>
                        </div>
                        
                        {!isFullyPaid && invoice.ownerIsPro && invoice.acceptOnlinePayment && !invoice.paymentPlanEnabled && (
                            !invoice.authorizedSignature ? (
                                <a
                                    href={`/invoice/${token}`}
                                    className="w-full md:w-auto px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Review & Sign to Pay
                                </a>
                            ) : (
                            <button
                                disabled={isCheckoutLoading}
                                onClick={() => handleCheckout()}
                                className={clsx("w-full md:w-auto px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2", isCheckoutLoading && "opacity-70 cursor-not-allowed")}
                            >
                                {isCheckoutLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Pay ${remainingBalance.toFixed(2)}
                                    </>
                                )}
                            </button>
                            )
                        )}

                        {isFullyPaid && (
                            <a 
                                href={`/invoice/${token}/bundle`}
                                className="w-full md:w-auto px-8 py-4 bg-white text-emerald-600 font-black rounded-2xl shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-center"
                            >
                                Download Receipt
                            </a>
                        )}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Payment Schedule (If Enabled) */}
                        {invoice.paymentPlanEnabled && invoice.installments && invoice.installments.length > 0 && (
                            <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                                <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Payment Schedule</h3>
                                </div>
                                <div className="divide-y divide-black/5 dark:divide-white/10">
                                    {invoice.installments.map((inst: Installment, index: number) => (
                                        <div key={inst.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                            <div className="flex-1 text-center sm:text-left">
                                                <div className="font-bold text-gray-900 dark:text-white text-lg">
                                                    {inst.label || `Installment ${index + 1}`}
                                                </div>
                                                {inst.dueDate && (
                                                    <div className="text-sm text-gray-500 dark:text-[var(--muted)] mt-1">
                                                        Due: {format(new Date(inst.dueDate), 'MMM d, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                                                ${inst.amount.toFixed(2)}
                                            </div>
                                            <div className="w-full sm:w-auto">
                                                {inst.status === 'PAID' ? (
                                                    <div className="px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold rounded-xl text-sm w-full text-center">Paid</div>
                                                ) : inst.status === 'PAYMENT_PENDING' ? (
                                                    <div className="px-4 py-2 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-bold rounded-xl text-sm w-full text-center">Pending</div>
                                                ) : !invoice.authorizedSignature && invoice.ownerIsPro && invoice.acceptOnlinePayment ? (
                                                    <a
                                                        href={`/invoice/${token}`}
                                                        className="w-full px-6 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl transition-colors text-center inline-block"
                                                    >
                                                        Sign to Pay
                                                    </a>
                                                ) : invoice.ownerIsPro && invoice.acceptOnlinePayment ? (
                                                    <button
                                                        disabled={isCheckoutLoading}
                                                        onClick={() => handleCheckout(inst.id)}
                                                        className={clsx("w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors", isCheckoutLoading && "opacity-70 cursor-not-allowed")}
                                                    >
                                                        Pay
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Invoice Items Summary */}
                        <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white">Invoice Details</h3>
                                <a href={`/invoice/${token}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View Original Document</a>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {invoice.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-[var(--muted)]">{item.quantity} x ${item.unitPrice.toFixed(2)}</div>
                                            </div>
                                            <div className="font-medium tabular-nums">${item.total.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        {/* Payment History */}
                        <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                <h3 className="font-bold text-gray-900 dark:text-white">Payment History</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {(!invoice.onlinePayments || invoice.onlinePayments.length === 0) && (!invoice.installments || invoice.installments.filter((i:any)=>i.status==='PAID').length === 0) && (
                                    <div className="text-center text-sm text-gray-500 dark:text-[var(--muted)] py-4">No payments recorded yet.</div>
                                )}
                                
                                {invoice.onlinePayments?.map((payment: any) => (
                                    <div key={payment.id} className="flex items-start gap-3">
                                        <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">${payment.amount.toFixed(2)}</div>
                                            <div className="text-xs text-gray-500 dark:text-[var(--muted)]">{format(new Date(payment.createdAt), 'MMM d, yyyy • h:mm a')}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">{payment.paymentMethod || 'Online Payment'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Customer Support Info */}
                        <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden p-6 text-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Need help?</h3>
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-4">Contact {invoice.businessName} directly regarding this invoice.</p>
                            {invoice.businessEmail && (
                                <a href={`mailto:${invoice.businessEmail}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                    {invoice.businessEmail}
                                </a>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}


```


## src\components\invoices\InvoiceActions.tsx
```tsx

"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function InvoiceActions({ invoice, isPro, trigger }: { invoice: { id: string; status: string; isConverted: boolean; publicToken?: string | null; convertedReceiptId?: string | null; acceptOnlinePayment?: boolean; paymentStatus?: string; remainingBalance?: number | null; paymentPlanEnabled?: boolean; installments?: any[]; }, isPro?: boolean, trigger?: React.ReactNode }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    // Sharing States
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [connections, setConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedInstallmentId, setSelectedInstallmentId] = useState('');

    // Dropdown State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeMenu = () => setIsMenuOpen(false);

    const handleAction = async (action: 'convert' | 'mark-paid' | 'delete' | 'toggle-payment') => {
        closeMenu();
        let confirmMsg = '';
        if (action === 'delete') confirmMsg = 'Are you sure you want to permanently delete this invoice?';
        if (action === 'convert') confirmMsg = 'Convert this PAID invoice to a permanent Receipt? This cannot be undone and will lock the invoice.';
        if (action === 'mark-paid') confirmMsg = 'Mark this invoice as PAID?';
        if (action === 'toggle-payment') confirmMsg = invoice.acceptOnlinePayment ? 'Disable online payments for this invoice?' : 'Enable secure online payments via Stripe for this invoice?';

        if (!window.confirm(confirmMsg)) return;

        setIsLoading(true);
        try {
            if (action === 'toggle-payment') {
                const res = await fetch(`/api/invoices/${invoice.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ acceptOnlinePayment: !invoice.acceptOnlinePayment })
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to toggle online payments');
                }
            } else {
                const endpoint = `/api/invoices/${invoice.id}${action === 'delete' ? '' : `/${action}`}`;
                const method = action === 'delete' ? 'DELETE' : 'POST';

                const res = await fetch(endpoint, { method });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || `Failed to execute action.`);
                }
            }

            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getOrCreateToken = async () => {
        const res = await fetch(`/api/invoices/${invoice.id}/generate-token`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate access link');
        return data.token;
    };

    const handleCopyLink = async () => {
        closeMenu();
        setIsLoading(true);
        try {
            const token = await getOrCreateToken();
            const link = `${window.location.origin}/portal/invoice/${token}?src=copy`;
            await navigator.clipboard.writeText(link);
            alert('Secure portal link copied.');
            
            // Log activity silently
            fetch(`/api/invoices/${invoice.id}/log-link-copy`, { method: 'POST' }).catch(() => {});
        } catch (error: any) {
            console.error(error);
            alert('Failed to copy link: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenShareModal = async () => {
        closeMenu();
        setIsShareModalOpen(true);
        await loadConnections();
    };

    const handleOpenPaymentRequestModal = async () => {
        closeMenu();
        if (!invoice.acceptOnlinePayment) {
            if (!window.confirm('Online payments are currently disabled for this invoice. You must enable secure Stripe payments to send a payment request. Enable now?')) {
                return;
            }
        }
        setIsPaymentRequestModalOpen(true);
        await loadConnections();
    };

    const loadConnections = async () => {
        setIsLoadingConnections(true);
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            if (res.ok) setConnections(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleSendToClient = async (userId: string) => {
        setIsSending(true);
        try {
            const token = await getOrCreateToken();
            const link = `${window.location.origin}/invoice/${token}`;
            
            const res = await fetch(`/api/messages/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `You have received a new secure Invoice.\n\nPlease review and confirm payment here:\n${link}`
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send message');
            }

            alert('Invoice sent successfully to client via Network Messages.');
            setIsShareModalOpen(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendPaymentRequest = async (userId: string) => {
        setIsSending(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send-payment-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientUserId: userId,
                    enableOnlinePayment: true // Enable it if they agreed to the prompt
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to send payment request');
            }

            alert('Payment request sent securely via Network Messages!');
            setIsPaymentRequestModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendEmailRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send-payment-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailRecipient, message: customMessage, enableOnlinePayment: true })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send email request');
            alert('Email payment request sent securely!');
            setIsEmailModalOpen(false);
            setEmailRecipient('');
            setCustomMessage('');
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendReminder = async (channel: 'EMAIL' | 'NETWORK', recipientIdOrEmail: string) => {
        setIsSending(true);
        try {
            const body: any = { channel, message: customMessage };
            if (selectedInstallmentId) body.installmentId = selectedInstallmentId;
            if (channel === 'EMAIL') body.email = recipientIdOrEmail;
            if (channel === 'NETWORK') body.recipientUserId = recipientIdOrEmail;

            const res = await fetch(`/api/invoices/${invoice.id}/send-payment-reminder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reminder');
            alert('Payment reminder sent!');
            setIsReminderModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleOpenEmailModal = () => {
        closeMenu();
        if (!invoice.acceptOnlinePayment) {
            if (!window.confirm('Online payments are disabled. Enable secure Stripe payments to send this request?')) return;
        }
        setIsEmailModalOpen(true);
    };

    const handleOpenReminderModal = async () => {
        closeMenu();
        setIsReminderModalOpen(true);
        setSelectedInstallmentId('');
        await loadConnections();
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {trigger ? (
                <div onClick={() => setIsMenuOpen(!isMenuOpen)} className={clsx("inline-block", isLoading && "opacity-50 cursor-not-allowed")}>
                    {trigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    disabled={isLoading}
                    className={clsx(
                        "flex items-center justify-center p-2 rounded-lg transition-colors border outline-none",
                        isMenuOpen 
                            ? "bg-gray-100 border-gray-300 dark:bg-white/10 dark:border-white/20 text-gray-900 dark:text-white"
                            : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5",
                        isLoading && "opacity-50 cursor-not-allowed"
                    )}
                    title="Options"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    )}
                </button>
            )}

            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-[var(--card)] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-[70] max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-[var(--border)]">
                    
                    {/* View and Copy Options */}
                    <div className="py-1">
                        <button onClick={handleCopyLink} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Copy Public Link
                        </button>
                    </div>

                    {/* Send & Request Options */}
                    {!invoice.isConverted && invoice.status !== 'PAID' && (
                        <div className="py-1">
                            {!invoice.isConverted && (
                                <button onClick={handleOpenShareModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    Send via Network
                                </button>
                            )}
                            
                            {isPro && (
                                <>
                                    <button onClick={handleOpenPaymentRequestModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Request Payment
                                    </button>
                                    <button onClick={handleOpenEmailModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Email Request
                                    </button>
                                    {invoice.status !== 'DRAFT' && (
                                        <button onClick={handleOpenReminderModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Send Reminder
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Management Actions */}
                    <div className="py-1">
                        {!invoice.isConverted && (
                            <Link href={`/dashboard/invoices/edit/${invoice.id}`} className="flex items-center px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={closeMenu}>
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Edit Invoice
                            </Link>
                        )}
                        
                        {isPro && !invoice.isConverted && invoice.status !== 'PAID' && (
                            <button onClick={() => handleAction('toggle-payment')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <svg className={clsx("mr-3 h-4 w-4", invoice.acceptOnlinePayment ? "text-[var(--text)]" : "text-[var(--muted)]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {invoice.acceptOnlinePayment ? "Disable Online Payments" : "Enable Online Payments"}
                            </button>
                        )}

                        {!invoice.isConverted && invoice.status !== 'PAID' && (
                            <button onClick={() => handleAction('mark-paid')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Mark as Paid
                            </button>
                        )}

                        {!invoice.isConverted && invoice.status === 'PAID' && (
                            <button onClick={() => handleAction('convert')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                Convert to Receipt
                            </button>
                        )}

                        {invoice.isConverted && (
                            <Link href={invoice.convertedReceiptId ? `/receipt/${invoice.convertedReceiptId}` : `/history`} className="flex items-center px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={closeMenu}>
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                View Receipt
                            </Link>
                        )}
                        
                        {invoice.status === 'PAID' && invoice.publicToken && (
                            <Link href={`/invoice/${invoice.publicToken}/bundle`} target="_blank" className="flex items-center px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={closeMenu}>
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Bundle
                            </Link>
                        )}

                        {!invoice.isConverted && invoice.status !== 'PAID' && (
                            <button onClick={() => handleAction('delete')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                <svg className="mr-3 h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Network Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                Send to Client Network
                            </h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-4 leading-relaxed">
                                Select a verified connection from your network to deploy this highly secure invoice to their private inbox instantly.
                            </p>
                            
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {isLoadingConnections ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : connections.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-black/20 rounded-xl ring-1 ring-black/5 dark:ring-white/5">
                                        <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium">No active connections found.</p>
                                        <p className="text-xs text-gray-400 dark:text-[var(--muted)]/50 mt-1">Connect with clients first to use this feature.</p>
                                    </div>
                                ) : (
                                    connections.map((conn) => (
                                        <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold flex-shrink-0 text-sm ring-1 ring-indigo-500/20">
                                                    {(conn.connectedUser.name || conn.connectedUser.email).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--text)] truncate">{conn.connectedUser.name || 'Unknown User'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-[var(--muted)] truncate">{conn.connectedUser.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                disabled={isSending}
                                                onClick={() => handleSendToClient(conn.connectedUser.id)}
                                                className="px-3 py-1.5 bg-white xl:bg-gray-100 dark:bg-black/40 hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors text-xs font-bold rounded-lg shadow-sm border border-gray-200 dark:border-white/10 disabled:opacity-50 break-keep flex-shrink-0"
                                            >
                                                {isSending ? 'Sending...' : 'Send'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Request Modal */}
            {isPaymentRequestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-amber-50/50 dark:bg-amber-500/10">
                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                Request Payment
                            </h3>
                            <button onClick={() => setIsPaymentRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-4 leading-relaxed">
                                Select a verified connection to send a secure, clickable payment request directly to their inbox.
                            </p>
                            
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {isLoadingConnections ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                                    </div>
                                ) : connections.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-black/20 rounded-xl ring-1 ring-black/5 dark:ring-white/5">
                                        <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium">No active connections found.</p>
                                    </div>
                                ) : (
                                    connections.map((conn) => (
                                        <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0 text-sm ring-1 ring-amber-500/20">
                                                    {(conn.connectedUser.name || conn.connectedUser.email).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--text)] truncate">{conn.connectedUser.name || 'Unknown User'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-[var(--muted)] truncate">{conn.connectedUser.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                disabled={isSending}
                                                onClick={() => handleSendPaymentRequest(conn.connectedUser.id)}
                                                className="px-3 py-1.5 bg-white xl:bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 hover:text-amber-700 text-amber-600 dark:text-amber-400 dark:hover:bg-amber-500/30 transition-colors text-xs font-bold rounded-lg shadow-sm border border-amber-200 dark:border-amber-500/30 disabled:opacity-50 break-keep flex-shrink-0"
                                            >
                                                {isSending ? 'Sending...' : 'Request'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Payment Request Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in text-left">
                    <form onSubmit={handleSendEmailRequest} className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-500/10">
                            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Email Payment Request
                            </h3>
                            <button type="button" onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Recipient Email *</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={emailRecipient} 
                                    onChange={(e) => setEmailRecipient(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-indigo-500/50" 
                                    placeholder="client@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Custom Message (Optional)</label>
                                <textarea 
                                    rows={3}
                                    value={customMessage} 
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" 
                                    placeholder="Add a personal note to the email..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-[var(--border)] flex justify-end gap-3">
                            <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-[var(--muted)] hover:text-gray-900 dark:hover:text-white" disabled={isSending}>Cancel</button>
                            <button type="submit" disabled={isSending} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2">
                                {isSending ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Send Reminder Modal */}
            {isReminderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in text-left">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-orange-50/50 dark:bg-orange-500/10">
                            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-500 flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Send Reminder
                            </h3>
                            <button type="button" onClick={() => setIsReminderModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            
                            {invoice.paymentPlanEnabled && invoice.installments && invoice.installments.some(i => i.status !== 'PAID') && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Select Installment (Optional)</label>
                                    <select 
                                        value={selectedInstallmentId}
                                        onChange={(e) => setSelectedInstallmentId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                                    >
                                        <option value="">Full Remaining Balance</option>
                                        {invoice.installments.filter(i => i.status !== 'PAID').map(inst => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.label || 'Installment'} - ${inst.amount.toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Custom Note (Optional)</label>
                                <textarea 
                                    rows={2}
                                    value={customMessage} 
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-sm" 
                                    placeholder="Add a note to the reminder..."
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)]">Send via Email</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="email" 
                                        value={emailRecipient} 
                                        onChange={(e) => setEmailRecipient(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" 
                                        placeholder="client@example.com"
                                    />
                                    <button 
                                        onClick={() => {
                                            if(!emailRecipient) return alert('Enter an email address');
                                            handleSendReminder('EMAIL', emailRecipient);
                                        }}
                                        disabled={isSending || !emailRecipient}
                                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-[var(--border)] pt-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-2">Or Send via Network</label>
                                <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {isLoadingConnections ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                                        </div>
                                    ) : connections.length === 0 ? (
                                        <p className="text-xs text-gray-500 dark:text-[var(--muted)] text-center py-4 bg-gray-50 dark:bg-black/20 rounded-lg">No active connections found.</p>
                                    ) : (
                                        connections.map((conn) => (
                                            <div key={conn.connectionId} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-[var(--border)] hover:border-orange-200 dark:hover:border-orange-500/30 transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                                                        {(conn.connectedUser.name || conn.connectedUser.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-[var(--text)] truncate">{conn.connectedUser.name || 'Unknown User'}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    disabled={isSending}
                                                    onClick={() => handleSendReminder('NETWORK', conn.connectedUser.id)}
                                                    className="px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 text-orange-600 dark:text-orange-400 dark:hover:bg-orange-500/30 transition-colors text-xs font-bold rounded-lg"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


```


## src\components\invoices\InvoiceActivityLog.tsx
```tsx

"use client";

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type ActivityLog = {
    id: string;
    channel: string;
    action: string;
    status: string;
    recipientEmail?: string;
    recipientUserId?: string;
    createdAt: string;
};

export default function InvoiceActivityLog({ invoiceId }: { invoiceId: string }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`/api/invoices/${invoiceId}/activity`);
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data.logs);
                }
            } catch (e) {
                console.error('Failed to fetch activity logs', e);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [invoiceId]);

    if (loading) {
        return <div className="text-sm text-[var(--muted)] animate-pulse">Loading activity...</div>;
    }

    if (logs.length === 0) {
        return null; // Hide completely if no activity
    }

    return (
        <div className="mt-8 border-t border-[var(--border)] pt-8 max-w-4xl mx-auto">
            <h3 className="text-lg font-bold text-[var(--text)] mb-4">Payment Request Activity</h3>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <ul className="divide-y divide-[var(--border)]">
                    {logs.map(log => {
                        let icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
                        let colorClass = "text-blue-500 bg-blue-500/10";
                        
                        if (log.channel === 'EMAIL') {
                            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
                            colorClass = "text-indigo-500 bg-indigo-500/10";
                        } else if (log.channel === 'NETWORK') {
                            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
                            colorClass = "text-purple-500 bg-purple-500/10";
                        }

                        let message = "";
                        if (log.action === 'LINK_COPIED') message = "Payment link copied to clipboard";
                        if (log.action === 'REQUEST_SENT') message = `Payment request sent via ${log.channel === 'EMAIL' ? 'email to ' + log.recipientEmail : 'Verihub Network'}`;
                        if (log.action === 'REMINDER_SENT') message = `Payment reminder sent via ${log.channel === 'EMAIL' ? 'email to ' + log.recipientEmail : 'Verihub Network'}`;

                        if (log.status === 'FAILED') colorClass = "text-red-500 bg-red-500/10";
                        if (log.status === 'BLOCKED') colorClass = "text-orange-500 bg-orange-500/10";

                        return (
                            <li key={log.id} className="p-4 flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                                    {icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-sm font-medium text-[var(--text)]">
                                            {message}
                                        </p>
                                        <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {log.status !== 'SENT' && (
                                        <p className="text-xs font-bold mt-1 uppercase" style={{ color: log.status === 'FAILED' ? 'rgb(239 68 68)' : 'rgb(249 115 22)' }}>
                                            {log.status}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}


```


## src\components\invoices\InvoiceCard.tsx
```tsx

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import InvoiceActions from './InvoiceActions';

export default function InvoiceCard({ invoice, isPro }: { invoice: any, isPro: boolean }) {
    const viewUrl = invoice.status === 'DRAFT' || invoice.status === 'CANCELLED'
        ? `/dashboard/invoices/edit/${invoice.id}`
        : invoice.isConverted && invoice.convertedReceiptId
            ? `/receipt/${invoice.convertedReceiptId}`
            : invoice.publicToken 
                ? `/invoice/${invoice.publicToken}` 
                : `/dashboard/invoices/edit/${invoice.id}`;

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm flex flex-col gap-4 relative">
            <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col min-w-0">
                    <div className="font-bold text-[var(--text)] text-base leading-tight truncate">
                        {invoice.title}
                    </div>
                    <div className="text-sm text-[var(--muted)] mt-0.5 truncate font-medium">
                        {invoice.clientName}
                    </div>
                    {invoice.invoiceNumber && (
                        <div className="text-xs text-[var(--muted)]/80 font-mono mt-0.5">
                            #{invoice.invoiceNumber}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="font-black text-[var(--text)] text-lg tabular-nums tracking-tight">
                        ${invoice.total.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        {invoice.status === 'PAID' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">PAID</span>}
                        {invoice.status === 'DRAFT' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--muted)]/10 text-[var(--muted)] border border-[var(--border)]">DRAFT</span>}
                        {invoice.status === 'SENT' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">SENT</span>}
                        {invoice.status === 'VIEWED' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">VIEWED</span>}
                        {invoice.status === 'CANCELLED' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">CANCELLED</span>}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <div className="text-[11px] text-[var(--muted)] font-medium">
                        {invoice.viewCount > 0 ? (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Viewed {invoice.lastViewedAt ? formatDistanceToNow(new Date(invoice.lastViewedAt), { addSuffix: true }) : ''}
                            </span>
                        ) : (
                            <span>Issued {formatDistanceToNow(new Date(invoice.issueDate), { addSuffix: true })}</span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Link 
                        href={viewUrl}
                        className="px-4 py-1.5 bg-[var(--text)] hover:bg-[var(--text)]/90 text-[var(--bg)] text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                        View
                    </Link>
                    <InvoiceActions 
                        invoice={{ 
                            id: invoice.id, 
                            status: invoice.status, 
                            isConverted: invoice.isConverted, 
                            publicToken: invoice.publicToken, 
                            convertedReceiptId: invoice.convertedReceiptId,
                            acceptOnlinePayment: invoice.acceptOnlinePayment,
                            paymentStatus: invoice.paymentStatus,
                            remainingBalance: invoice.remainingBalance
                        }} 
                        isPro={isPro} 
                    />
                </div>
            </div>
        </div>
    );
}


```


## src\components\invoices\InvoiceDocument.tsx
```tsx

import React from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export interface InvoiceDocumentProps {
    invoice: {
        id: string;
        invoiceNumber: string | null;
        clientName: string;
        clientEmail: string | null;
        clientCompany: string | null;
        clientPhone: string | null;
        clientAddress: string | null;
        clientPropertyAddress: string | null;
        title: string;
        description: string | null;
        currency: string;
        subtotal: number;
        discountType?: string;
        discountValue?: number;
        tax: number;
        total: number;
        depositAmount?: number | null;
        paymentMethod?: string | null;
        issueDate: string;
        dueDate: string | null;
        notes: string | null;
        attachedPhotos?: any;
        payments?: {
            id: string;
            amount: number;
            method: string;
            date: string;
            isDeposit: boolean;
            note?: string;
        }[];
        status: string;
        isConverted: boolean;
        paymentConfirmed: boolean;
        paymentConfirmedAt: string | null;
        authorizedSignature?: string | null;
        publicToken?: string | null;
        businessName?: string | null;
        businessEmail?: string | null;
        businessPhone?: string | null;
        businessAddress?: string | null;
        businessLogoPath?: string | null;
        businessRegistrationNumber?: string | null;
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            total: number;
        }[];
    };
    onSignatureClick?: () => void;
}

export default function InvoiceDocument({ invoice, onSignatureClick }: InvoiceDocumentProps) {
    const isPaid = invoice.status === 'PAID';
    const isDraft = invoice.status === 'DRAFT';
    const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date(new Date().setHours(0,0,0,0));
    
    // Smart Payment Logic
    const payments = invoice.payments || [];
    let amountPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    // Fallback for older invoices that only used depositAmount
    if (amountPaid === 0 && invoice.depositAmount) {
        amountPaid = invoice.depositAmount;
    }
    
    // If status is PAID but no payments are recorded, assume total is paid
    if (isPaid && amountPaid === 0) {
        amountPaid = invoice.total;
    }

    const balanceDue = Math.max(0, invoice.total - amountPaid);

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    return (
        <div className="w-full bg-white dark:bg-[#0b1220] rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col relative z-10 transition-all duration-500 print:shadow-none print:ring-0 print:rounded-none print:bg-white print:m-0 print:p-0">
            
            {/* --- PAID WATERMARK --- */}
            {isPaid && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 print:opacity-40">
                    <span className="text-[12rem] font-black text-emerald-500/5 dark:text-emerald-500/10 rotate-[-30deg] tracking-widest select-none print:text-emerald-600/[0.08]">
                        PAID
                    </span>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="px-6 py-8 sm:p-10 border-b border-gray-100 dark:border-[var(--border)] relative overflow-hidden bg-gray-50/50 dark:bg-black/20 print:bg-transparent print:border-gray-300">
                {/* Subtle visual accent for screen rendering */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 dark:bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none print:hidden"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8 relative z-10">
                    {/* Left: Business Identity & Invoice Core */}
                    <div className="w-full sm:w-auto flex flex-col">
                        <div className="flex items-center gap-4 mb-6 sm:mb-8 h-16 print:h-12">
                            {invoice.businessLogoPath ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={invoice.businessLogoPath} 
                                    alt="Business Logo" 
                                    className="max-h-16 max-w-[200px] object-contain rounded-sm mix-blend-multiply dark:mix-blend-normal print:mix-blend-normal" 
                                />
                            ) : invoice.businessName ? (
                                <div className="flex flex-col justify-center">
                                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none print:text-black">
                                        {invoice.businessName}
                                    </span>
                                    {invoice.businessRegistrationNumber && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 print:text-slate-600">
                                            Reg/EIN: {invoice.businessRegistrationNumber}
                                        </span>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Extended Business Metadata */}
                        {(invoice.businessEmail || invoice.businessPhone) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
                                {invoice.businessEmail && <span>{invoice.businessEmail}</span>}
                                {invoice.businessEmail && invoice.businessPhone && <span className="text-slate-300 dark:text-slate-700 print:text-slate-400">&bull;</span>}
                                {invoice.businessPhone && <span>{invoice.businessPhone}</span>}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            {isPaid ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 print:text-emerald-800 print:border-current print:bg-transparent">
                                    Paid
                                </span>
                            ) : isOverdue ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 print:text-red-800 print:border-current print:bg-transparent">
                                    Overdue
                                </span>
                            ) : isDraft ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 print:text-slate-600 print:border-current print:bg-transparent">
                                    Draft
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 print:text-blue-800 print:border-current print:bg-transparent">
                                    Sent
                                </span>
                            )}
                            
                            {invoice.invoiceNumber && (
                                <span className="inline-flex items-center text-sm font-mono font-bold text-slate-600 dark:text-slate-300 print:text-slate-800">
                                    #{invoice.invoiceNumber}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight print:text-black">
                            {invoice.title}
                        </h1>
                        {invoice.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md print:text-slate-600 print:line-clamp-none">
                                {invoice.description}
                            </p>
                        )}
                    </div>

                    {/* Right: Client / Billed To */}
                    <div className="text-left sm:text-right w-full sm:w-auto p-5 sm:p-0 bg-white/60 dark:bg-black/20 rounded-2xl ring-1 ring-black/5 sm:ring-0 dark:ring-0 sm:bg-transparent sm:dark:bg-transparent print:bg-transparent print:ring-0 print:p-0 print:text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 print:text-slate-500">
                            Billed To
                        </p>
                        
                        {invoice.clientCompany && (
                            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight print:text-black">
                                {invoice.clientCompany}
                            </p>
                        )}
                        <p className={clsx("font-semibold text-slate-800 dark:text-slate-200 print:text-slate-800", invoice.clientCompany ? "text-sm mt-0.5" : "text-base sm:text-lg font-bold text-slate-900 dark:text-white print:text-black")}>
                            {invoice.clientName}
                        </p>
                        
                        {(invoice.clientEmail || invoice.clientPhone) && (
                            <div className="mt-1 space-y-0.5">
                                {invoice.clientEmail && <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">{invoice.clientEmail}</p>}
                                {invoice.clientPhone && <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">{invoice.clientPhone}</p>}
                            </div>
                        )}

                        {invoice.clientAddress && (
                            <pre className="text-sm text-slate-500 dark:text-slate-400 font-sans mt-3 whitespace-pre-wrap leading-relaxed print:text-slate-600">
                                {invoice.clientAddress}
                            </pre>
                        )}
                        
                        {/* Service Property Address Block */}
                        {invoice.clientPropertyAddress && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 print:border-slate-300">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">
                                    Service Address
                                </p>
                                <pre className="text-sm text-slate-500 dark:text-slate-400 font-sans whitespace-pre-wrap leading-relaxed print:text-slate-600">
                                    {invoice.clientPropertyAddress}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- METADATA STRIP --- */}
            <div className="px-6 py-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-transparent border-b border-gray-100 dark:border-[var(--border)] print:border-gray-300 print:bg-transparent">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">Date Issued</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</p>
                </div>
                {invoice.dueDate && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">Due Date</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">Invoice ID</p>
                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-widest print:text-black">{invoice.id.split('-')[0].slice(0, 8)}</p>
                </div>
                {isPaid && invoice.paymentConfirmedAt && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-600 mb-1.5 print:text-emerald-700">Payment Received</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{format(new Date(invoice.paymentConfirmedAt), 'MMM d, yyyy')}</p>
                    </div>
                )}
                {isOverdue && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-500 mb-1.5 print:text-red-600">Status</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 print:text-red-600">
                            {Math.floor((new Date().getTime() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24))} Days Overdue
                        </p>
                    </div>
                )}
            </div>

            {/* --- LINE ITEMS --- */}
            <div className="px-6 py-8 sm:px-10 flex-1 bg-white dark:bg-transparent print:bg-transparent relative z-10">
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-800 print:border-slate-400">
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider print:text-black">Item / Description</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-24 print:text-black">Qty</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-32 print:text-black">Rate</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-32 print:text-black">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-300">
                            {invoice.items.map((item) => (
                                <tr key={item.id} className="group print:break-inside-avoid">
                                    <td className="py-5 px-2 align-top">
                                        <div className="font-bold text-slate-900 dark:text-white print:text-black">{item.name}</div>
                                        {item.description && (
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap print:text-slate-700">
                                                {item.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-5 px-2 align-top text-center text-sm font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
                                        {item.quantity}
                                    </td>
                                    <td className="py-5 px-2 align-top text-right text-sm font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
                                        {formatCurrency(item.unitPrice, invoice.currency)}
                                    </td>
                                    <td className="py-5 px-2 align-top text-right font-bold text-slate-900 dark:text-white print:text-black">
                                        {formatCurrency(item.total, invoice.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- TOTALS BLOCK --- */}
                <div className="mt-8 flex flex-col items-end print:break-inside-avoid">
                    <div className="w-full sm:w-[380px] bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 ring-1 ring-slate-200 dark:ring-slate-700/50 shadow-sm print:bg-transparent print:ring-0 print:border print:border-slate-300 print:rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium print:text-slate-700">Subtotal</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums print:text-black">
                                {formatCurrency(invoice.subtotal, invoice.currency)}
                            </span>
                        </div>
                        
                        {invoice.discountType && invoice.discountType !== 'none' && (
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium print:text-slate-700">
                                    Discount {invoice.discountType === 'percent' && `(${invoice.discountValue}%)`}
                                </span>
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums print:text-black">
                                    -{formatCurrency(
                                        invoice.discountType === 'percent' 
                                            ? invoice.subtotal * ((invoice.discountValue || 0) / 100) 
                                            : invoice.discountValue || 0,
                                        invoice.currency
                                    )}
                                </span>
                            </div>
                        )}

                        {invoice.tax !== null && invoice.tax > 0 && (
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700/50 print:border-slate-300">
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium print:text-slate-700">Tax</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums print:text-black">
                                    {formatCurrency(invoice.tax, invoice.currency)}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-end mt-4">
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-slate-900 dark:text-white print:text-black">Total</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums print:text-black">
                                {formatCurrency(invoice.total, invoice.currency)}
                            </span>
                        </div>
                        
                        {payments && payments.length > 0 ? (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 border-dashed print:border-slate-300">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 print:text-slate-500">Payment History</div>
                                {payments.map((payment) => (
                                    <div key={payment.id} className="flex justify-between items-center mt-1.5 text-emerald-600 dark:text-emerald-400 print:text-emerald-700 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{payment.date ? format(new Date(payment.date), 'MMM d, yyyy') : 'Payment'}</span>
                                            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                {payment.method}
                                            </span>
                                            {payment.note && <span className="text-xs text-slate-400 italic hidden sm:inline">- {payment.note}</span>}
                                        </div>
                                        <span className="font-semibold tabular-nums">-{formatCurrency(payment.amount, invoice.currency)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : amountPaid > 0 ? (
                            <div className="flex justify-between items-center mt-3 text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                                <span className="text-sm font-medium">Amount Paid</span>
                                <span className="text-base font-semibold tabular-nums">-{formatCurrency(amountPaid, invoice.currency)}</span>
                            </div>
                        ) : null}

                        {invoice.paymentMethod && (!payments || payments.length === 0) && (
                            <div className="flex justify-between items-center mt-1 text-slate-500 dark:text-slate-400 print:text-slate-500">
                                <span className="text-[11px] font-medium uppercase tracking-wider">Payment Method</span>
                                <span className="text-xs font-semibold">{invoice.paymentMethod}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-end mt-5 pt-5 border-t-2 border-slate-200 dark:border-slate-700 print:border-slate-300">
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-slate-900 dark:text-white print:text-black">Balance Due</span>
                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 print:text-slate-500">
                                    {invoice.currency}
                                </span>
                            </div>
                            <span className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-500 tabular-nums tracking-tight print:text-black">
                                {balanceDue === 0 ? "Paid in Full" : formatCurrency(balanceDue, invoice.currency)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER: NOTES & ATTACHMENTS --- */}
                {invoice.notes && (
                    <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 print:border-slate-300 print:break-inside-avoid">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 print:text-slate-600">Terms & Additional Notes</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed print:text-slate-800">
                            {invoice.notes}
                        </p>
                    </div>
                )}

                {invoice.attachedPhotos && Array.isArray(invoice.attachedPhotos) && invoice.attachedPhotos.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 print:break-inside-avoid print:border-slate-300">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 print:text-slate-600">Attached Media</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {invoice.attachedPhotos.map((photo: string, i: number) => (
                                <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity print:border-slate-300">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* --- AUTHORIZED SIGNATURE --- */}
                <div className="mt-12 pt-8 flex justify-end print:break-inside-avoid">
                    <div className="w-full sm:w-80 flex flex-col items-center">
                        {invoice.authorizedSignature ? (
                            <div className="flex flex-col items-center mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={invoice.authorizedSignature} alt="Authorized Signature" className="h-16 object-contain mix-blend-multiply dark:mix-blend-normal dark:invert print:mix-blend-normal print:invert-0" />
                            </div>
                        ) : onSignatureClick ? (
                            <button 
                                onClick={onSignatureClick}
                                className="w-full h-16 mb-2 border-b-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center justify-center rounded-t-lg group cursor-pointer print:hidden"
                            >
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Click here to sign
                                </span>
                            </button>
                        ) : (
                            <div className="w-full border-b border-slate-300 dark:border-slate-600 print:border-slate-400 h-16 mb-2"></div>
                        )}
                        <div className="w-full border-t border-slate-200 dark:border-slate-700/50 print:border-slate-300 pt-3 text-center">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">Authorized Signature</p>
                            {invoice.paymentConfirmedAt && invoice.authorizedSignature && (
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1 print:text-slate-500">
                                    Signed: {format(new Date(invoice.paymentConfirmedAt), 'MMM d, yyyy - h:mm a')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* --- TRUST LAYER FOOTER --- */}
                <div className="mt-16 pt-6 border-t border-slate-100 dark:border-slate-800/50 print:border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-slate-400 dark:text-slate-500 print:text-slate-500">
                            Generated on {format(new Date(), 'MMM d, yyyy')}
                        </p>
                        {invoice.publicToken && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 print:text-slate-400">
                                Verify this invoice at verihub.app/invoice/{invoice.publicToken}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 opacity-60 grayscale print:opacity-100 print:grayscale-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 print:text-slate-500">Securely issued via</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/assets/text-logo.png" alt="Verihub" className="h-3 w-auto dark:invert print:invert-0" />
                    </div>
                </div>
            </div>
        </div>
    );
}


```


## src\components\invoices\InvoiceWizard.tsx
```tsx

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { compressToWebp } from '@/lib/imageOpt';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export interface InvoiceItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface PaymentRecord {
    id: string;
    amount: number;
    method: string;
    date: string;
    isDeposit: boolean;
    note?: string;
}

export interface InvoiceWizardProps {
    isPro?: boolean;
    businessName?: string;
    businessLogoPath?: string;
    businessRegistrationNumber?: string;
    initialData?: {
        id?: string;
        customerContactId?: string | null;
        clientName: string;
        clientEmail: string;
        clientCompany?: string;
        clientPhone?: string;
        clientAddress?: string;
        clientPropertyAddress?: string;
        title: string;
        description: string;
        issueDate: string;
        dueDate: string;
        notes: string;
        attachedPhotos?: string[];
        tax: number;
        depositAmount?: number;
        paymentMethod?: string;
        payments?: PaymentRecord[];
        discountType?: string;
        discountValue?: number;
        items: InvoiceItem[];
        status?: string;
    };
}

export default function InvoiceWizard({ isPro = false, businessName, businessLogoPath, businessRegistrationNumber, initialData }: InvoiceWizardProps) {
    const router = useRouter();
    const isEdit = !!initialData?.id;

    const [step, setStep] = useState(isEdit ? 3 : 1);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1: Client Info
    const [clientName, setClientName] = useState(initialData?.clientName || '');
    const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '');
    const [clientCompany, setClientCompany] = useState(initialData?.clientCompany || '');
    const [clientPhone, setClientPhone] = useState(initialData?.clientPhone || '');
    const [clientAddress, setClientAddress] = useState(initialData?.clientAddress || '');
    const [clientPropertyAddress, setClientPropertyAddress] = useState(initialData?.clientPropertyAddress || '');
    const [propertyDifferent, setPropertyDifferent] = useState(!!initialData?.clientPropertyAddress);
    const [customerContactId, setCustomerContactId] = useState<string | null>(initialData?.customerContactId || null);

    // Contacts
    const [contacts, setContacts] = useState<any[]>([]);
    useEffect(() => {
        if (isPro) {
            fetch('/api/contacts')
                .then(res => res.json())
                .then(data => {
                    if (data && Array.isArray(data)) setContacts(data);
                })
                .catch(console.error);
        }
    }, [isPro]);

    const handleSelectContact = (contactId: string) => {
        if (!contactId) {
            setCustomerContactId(null);
            return;
        }
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            setCustomerContactId(contact.id);
            setClientName(contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
            setClientEmail(contact.email || '');
            setClientPhone(contact.phone || '');
            setClientCompany(contact.company || '');
            
            const addressParts = [contact.addressLine1, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
            setClientAddress(addressParts.join(', '));
        }
    };

    // Step 2: Details
    const [title, setTitle] = useState(initialData?.title || 'Invoice');
    const [description, setDescription] = useState(initialData?.description || '');
    const [issueDate, setIssueDate] = useState(initialData?.issueDate ? new Date(initialData.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [dueDate, setDueDate] = useState(initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 10) : '');

    // Step 3: Items
    const [items, setItems] = useState<InvoiceItem[]>(initialData?.items?.length ? initialData.items : [{ id: '1', name: '', description: '', quantity: 1, unitPrice: 0 }]);
    const [tax, setTax] = useState(initialData?.tax || 0);
    const [discountType, setDiscountType] = useState<"none" | "percent" | "flat">(initialData?.discountType as any || "none");
    const [discountValue, setDiscountValue] = useState<number>(initialData?.discountValue || 0);
    
    // Payments & Installments State
    const [payments, setPayments] = useState<PaymentRecord[]>(() => {
        if (initialData?.payments?.length) return initialData.payments;
        // Legacy migration
        if (initialData?.depositAmount && initialData.depositAmount > 0) {
            return [{
                id: Math.random().toString(36).substr(2, 9),
                amount: initialData.depositAmount,
                method: initialData.paymentMethod || 'Other',
                date: initialData.issueDate ? new Date(initialData.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                isDeposit: true,
                note: 'Initial Deposit'
            }];
        }
        return [];
    });

    const [notes, setNotes] = useState(initialData?.notes || '');
    const [attachedPhotos, setAttachedPhotos] = useState<string[]>(initialData?.attachedPhotos || []);

    // Smart Autofill State
    const [activeInputId, setActiveInputId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const debouncedQuery = useDebounce(searchQuery, 250);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!activeInputId) {
                setSuggestions([]);
                return;
            }
            try {
                const queryStr = debouncedQuery ? debouncedQuery : "";
                const res = await fetch(`/api/items/suggest?q=${encodeURIComponent(queryStr)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions", error);
            }
        };
        fetchSuggestions();
    }, [debouncedQuery, activeInputId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setSuggestions([]);
                setActiveInputId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculations
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    }, [items]);

    const calculatedDiscount = useMemo(() => {
        if (discountType === "percent") {
            return subtotal * ((discountValue || 0) / 100);
        } else if (discountType === "flat") {
            return discountValue || 0;
        }
        return 0;
    }, [subtotal, discountType, discountValue]);

    const subtotalAfterDiscount = Math.max(0, subtotal - calculatedDiscount);
    const total = subtotalAfterDiscount + Number(tax);
    
    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0), [payments]);
    const balanceDue = Math.max(0, total - totalPaid);

    // Handlers
    const addPayment = () => {
        setPayments(prev => [...prev, { 
            id: Math.random().toString(36).substr(2, 9), 
            amount: 0, 
            method: 'Credit Card', 
            date: new Date().toISOString().slice(0, 10), 
            isDeposit: prev.length === 0,
            note: prev.length === 0 ? 'Upfront Deposit' : `Installment ${prev.length + 1}`
        }]);
    };

    const removePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const updatePayment = (id: string, field: keyof PaymentRecord, value: any) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addItem = () => {
        setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: '', description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

        if (field === 'name') {
            setActiveInputId(id);
            setSearchQuery(value as string);
            setActiveSuggestionIndex(-1);
            if (!value) setSuggestions([]);
        }
    };

    const handleSelectSuggestion = (id: string, value: string) => {
        updateItem(id, 'name', value);
        setSuggestions([]);
        setActiveInputId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (!activeInputId || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
            e.preventDefault();
            handleSelectSuggestion(id, suggestions[activeSuggestionIndex]);
        } else if (e.key === 'Escape') {
            setSuggestions([]);
            setActiveInputId(null);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        try {
            const compressedPhotos = await Promise.all(
                files.map(file => compressToWebp(file))
            );
            setAttachedPhotos(prev => [...prev, ...compressedPhotos]);
        } catch (error) {
            console.error("Failed to compress and upload photos", error);
            alert("Failed to process one or more photos. Please try again.");
        }
    };

    const handleNext = () => {
        if (step === 1 && !clientName.trim()) return alert('Client Name is required');
        if (step === 2 && (!title.trim() || !issueDate)) return alert('Title and Issue Date are required');
        if (step === 3) {
            if (items.some(i => !i.name.trim() || i.quantity <= 0)) {
                return alert('All items must have a name and a valid quantity');
            }
        }
        setStep(s => Math.min(s + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setStep(s => Math.max(s - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (targetStatus: 'DRAFT' | 'SENT') => {
        if (!clientName.trim() || !title.trim() || !issueDate) return alert('Missing required fields');
        if (items.some(i => !i.name.trim() || i.quantity <= 0)) return alert('Invalid line items');

        setIsSaving(true);
        try {
            const payload = {
                customerContactId,
                clientName,
                clientEmail,
                clientCompany,
                clientPhone,
                clientAddress,
                clientPropertyAddress: propertyDifferent ? clientPropertyAddress : '',
                title,
                description,
                issueDate: new Date(issueDate).toISOString(),
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                discountType,
                discountValue,
                tax: Number(tax),
                depositAmount: totalPaid > 0 ? payments[0]?.amount || 0 : 0, // Fallback for old schema
                paymentMethod: payments.length > 0 ? payments[0].method : '',
                payments,
                notes,
                attachedPhotos,
                status: targetStatus,
                items
            };

            const endpoint = isEdit ? `/api/invoices/${initialData.id}` : '/api/invoices/create';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save invoice');
            }

            const data = await res.json();
            // Redirect to invoice viewer/dashboard
            router.push('/dashboard/invoices');
            router.refresh();

        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto pb-24 relative select-none sm:select-auto">
            
            {/* Top Stepper Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[var(--border)] z-0 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-500 rounded-full" 
                            style={{ width: `${((step - 1) / 3) * 100}%` }}
                        />
                    </div>
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => {
                                    if (isEdit || s < step) {
                                        setStep(s);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                    step === s ? "bg-blue-600 text-white shadow-blue-500/30 scale-110" : 
                                    step > s ? "bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer" : "bg-[var(--card)] border-2 border-[var(--border)] text-[var(--muted)]",
                                    (isEdit || s < step) && step !== s ? "cursor-pointer hover:border-blue-400 hover:text-blue-500" : (step < s ? "cursor-default" : "")
                                )}
                            >
                                {step > s ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : s}
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-3 px-1 text-[10px] sm:text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    <span>Client</span>
                    <span>Details</span>
                    <span>Items</span>
                    <span>Review</span>
                </div>
            </div>

            {/* Main Card Area */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-lg p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                
                {/* STEP 1: CLIENT INFO */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text)]">Client Information</h2>
                            <p className="text-sm text-[var(--muted)] mt-1">Who is this invoice for?</p>
                        </div>
                        
                        {isPro && contacts.length > 0 && (
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 mb-6">
                                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">Select Existing Customer (Optional)</label>
                                <select 
                                    value={customerContactId || ''}
                                    onChange={e => handleSelectContact(e.target.value)}
                                    className="w-full bg-white dark:bg-black/20 border border-indigo-200 dark:border-indigo-500/30 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value="">-- Choose a contact to autofill --</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name || c.email || c.phone}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Primary Contact Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={clientName} 
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Company Name (Optional)</label>
                                <input 
                                    type="text" 
                                    value={clientCompany} 
                                    onChange={(e) => setClientCompany(e.target.value)}
                                    placeholder="Acme Corp LLC"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Contact Email (Optional)</label>
                                <input 
                                    type="email" 
                                    value={clientEmail} 
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    placeholder="billing@acmecorp.com"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Phone Number (Optional)</label>
                                <input 
                                    type="tel" 
                                    value={clientPhone} 
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            
                            <div className="md:col-span-2 pt-2 border-t border-[var(--border)] mt-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Billing Address (Optional)</label>
                                <textarea 
                                    value={clientAddress} 
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    placeholder="123 Financial District&#10;Suite 400&#10;New York, NY 10004"
                                    rows={2}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setPropertyDifferent(!propertyDifferent)}
                                    className="w-10 h-6 bg-[var(--border)] rounded-full relative transition-colors border border-black/5 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
                                    style={{ backgroundColor: propertyDifferent ? '#3b82f6' : undefined }}
                                >
                                    <span className={clsx("absolute top-[3px] left-[3px] bg-white w-4 h-4 rounded-full transition-transform shadow-md", propertyDifferent && "translate-x-4")} />
                                </button>
                                <span className="text-sm font-medium text-[var(--text)] cursor-pointer select-none" onClick={() => setPropertyDifferent(!propertyDifferent)}>
                                    Service/Property Address is different from Billing Address
                                </span>
                            </div>

                            {propertyDifferent && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Service/Property Address <span className="text-blue-500">*</span></label>
                                    <textarea 
                                        value={clientPropertyAddress} 
                                        onChange={(e) => setClientPropertyAddress(e.target.value)}
                                        placeholder="456 Real Estate Blvd&#10;Los Angeles, CA 90001"
                                        rows={2}
                                        className="w-full bg-blue-500/5 border border-blue-500/20 text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                    />
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* STEP 2: INVOICE DETAILS */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text)]">Invoice Details</h2>
                            <p className="text-sm text-[var(--muted)] mt-1">Provide project specifics and timelines.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Invoice Title <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Web Design & Development"
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium"
                                    autoFocus
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Description (Optional)</label>
                                <textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Details regarding the scope of work..."
                                    rows={3}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Issue Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    value={issueDate} 
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Due Date (Optional)</label>
                                <input 
                                    type="date" 
                                    value={dueDate} 
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: LINE ITEMS */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text)]">Line Items</h2>
                                <p className="text-sm text-[var(--muted)] mt-1">Add your services or products.</p>
                            </div>
                            <div className="text-xl font-bold text-blue-500 tabular-nums bg-blue-500/10 px-4 py-1.5 rounded-lg border border-blue-500/20">
                                ${subtotal.toFixed(2)}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="relative bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 group">
                                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-xs font-bold shadow-sm">
                                        {index + 1}
                                    </div>
                                    {items.length > 1 && (
                                        <button 
                                            onClick={() => removeItem(item.id)}
                                            className="absolute top-4 right-4 text-red-500/40 hover:text-red-500 transition-colors p-1"
                                            title="Remove Item"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                        <div className="sm:col-span-12">
                                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Item Name</label>
                                            <div className="relative" ref={wrapperRef}>
                                                <input 
                                                    type="text" 
                                                    value={item.name} 
                                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                    onKeyDown={e => handleKeyDown(e, item.id)}
                                                    placeholder="e.g. Server Hosting (1 Year)"
                                                    className="w-full bg-transparent border-b border-[var(--border)] focus:border-blue-500 text-[var(--text)] px-1 py-2 outline-none transition-colors font-semibold"
                                                    autoFocus={index === items.length - 1}
                                                />
                                                {isPro && activeInputId === item.id && suggestions.length > 0 && (
                                                    <ul className="absolute z-[110] w-full bg-[var(--card)] border border-[var(--border)] mt-2 rounded-lg shadow-xl overflow-y-auto py-1 max-h-48 text-left">
                                                        {suggestions.map((s, idx) => (
                                                            <li
                                                                key={idx}
                                                                onClick={(e) => { e.stopPropagation(); handleSelectSuggestion(item.id, s); }}
                                                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${idx === activeSuggestionIndex ? 'bg-blue-600 text-white' : 'text-[var(--text)] hover:bg-[var(--card-hover)]'}`}
                                                            >
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Qty</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={item.quantity === 0 ? '' : item.quantity} 
                                                onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                className="w-full bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 tabular-nums"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Unit Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice === 0 ? '' : item.unitPrice} 
                                                    onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-lg pl-7 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-5 flex flex-col justify-end">
                                            <div className="text-right pb-2">
                                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mr-2">Line Total:</span>
                                                <span className="text-[var(--text)] font-semibold tabular-nums">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={addItem}
                                className="w-full py-4 border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] hover:border-blue-500/30 rounded-2xl transition-all font-semibold flex items-center justify-center gap-2 text-sm group"
                            >
                                <div className="w-6 h-6 rounded-full bg-[var(--border)] group-hover:bg-blue-500/20 text-[var(--text)] group-hover:text-blue-500 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                </div>
                                Add Another Item
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: REVIEW & FINALIZE */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="text-center sm:text-left">
                            <h2 className="text-xl font-bold text-[var(--text)]">Review Invoice</h2>
                            <p className="text-sm text-[var(--muted)] mt-1">Finalize amounts and save your document.</p>
                        </div>

                        {/* Visual Live Preview Card */}
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 sm:p-8 shadow-inner relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5 4.5 4.5H13V3.5zM18 20H6V4h6v5a1 1 0 0 0 1 1h5v10z"/></svg>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[var(--border)] pb-6 mb-6">
                                <div>
                                    {/* Sender Info / Business Profile */}
                                    {(businessLogoPath || businessName) && (
                                        <div className="flex items-center gap-3 mb-6">
                                            {businessLogoPath && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={businessLogoPath} alt="Business Logo" className="h-10 w-auto object-contain rounded-lg ring-1 ring-black/5 dark:ring-white/10 p-1 bg-white dark:bg-black/20" />
                                            )}
                                            {businessName && (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-extrabold text-[var(--text)] tracking-tight leading-none">{businessName}</span>
                                                    {businessRegistrationNumber && (
                                                        <span className="text-[11px] text-[var(--muted)] font-medium mt-1">Reg/EIN no: {businessRegistrationNumber}</span>
                                                    )}
                                                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mt-1">Invoice Sender</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Billed To</h3>
                                    {clientCompany && <p className="text-lg font-bold text-[var(--text)] leading-tight">{clientCompany}</p>}
                                    <p className={clsx("font-bold text-[var(--text)]", clientCompany ? "text-sm text-[var(--muted)] font-medium mt-0.5" : "text-lg")}>{clientName}</p>
                                    
                                    {(clientEmail || clientPhone) && (
                                        <div className="mt-1 space-y-0.5">
                                            {clientEmail && <p className="text-sm text-[var(--muted)]">{clientEmail}</p>}
                                            {clientPhone && <p className="text-sm text-[var(--muted)]">{clientPhone}</p>}
                                        </div>
                                    )}

                                    {clientAddress && <pre className="text-sm text-[var(--muted)] font-sans mt-2 whitespace-pre-wrap leading-relaxed">{clientAddress}</pre>}
                                    
                                    {propertyDifferent && clientPropertyAddress && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
                                            <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Service Address</h4>
                                            <pre className="text-sm text-[var(--muted)] font-sans whitespace-pre-wrap leading-relaxed">{clientPropertyAddress}</pre>
                                        </div>
                                    )}
                                </div>
                                <div className="sm:text-right">
                                    <p className="text-xl font-bold text-[var(--text)]">{title}</p>
                                    <p className="text-sm text-[var(--muted)] mt-1">Issue: {issueDate ? format(new Date(issueDate), 'MMM d, yyyy') : 'N/A'}</p>
                                    {dueDate && <p className="text-sm text-red-400 font-medium">Due: {format(new Date(dueDate), 'MMM d, yyyy')}</p>}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[var(--muted)]">{item.quantity}x</span>
                                            <span className="font-medium text-[var(--text)]">{item.name}</span>
                                        </div>
                                        <span className="text-[var(--text)] tabular-nums">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-[var(--border)] pt-5 space-y-3">
                                <div className="flex justify-between text-sm text-[var(--muted)]">
                                    <span>Subtotal</span>
                                    <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider">Discount</span>
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as any)}
                                            className="bg-[var(--card)] border border-[var(--border)] rounded px-1.5 py-1 text-xs outline-none text-[var(--text)]"
                                        >
                                            <option value="none">None</option>
                                            <option value="percent">%</option>
                                            <option value="flat">$ Flat</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 max-w-[120px]">
                                        {discountType !== 'none' && (
                                            <>
                                                {discountType === 'flat' && <span className="text-[var(--muted)]">$</span>}
                                                {discountType === 'percent' && <span className="text-[var(--muted)]">%</span>}
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={discountValue === 0 ? '' : discountValue}
                                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 outline-none text-right tabular-nums focus:border-blue-500 transition-colors"
                                                    placeholder="0.00"
                                                />
                                            </>
                                        )}
                                        <span className="text-red-400 font-medium tabular-nums w-16 text-right">
                                            -{calculatedDiscount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--muted)]">Calculated Tax</span>
                                    <div className="flex items-center gap-2 max-w-[120px]">
                                        <span className="text-[var(--muted)]">$</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={tax === 0 ? '' : tax}
                                            onChange={(e) => setTax(Number(e.target.value))}
                                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 outline-none text-right tabular-nums focus:border-blue-500 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end pt-3 text-[var(--text)] border-t border-[var(--border)]">
                                    <span className="font-bold uppercase tracking-wider text-xs">Total Amount</span>
                                    <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight">${total.toFixed(2)}</span>
                                </div>

                                <div className="pt-4 mt-4 border-t border-[var(--border)]/50 border-dashed space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-[var(--text)]">Payments & Installments</span>
                                        <button 
                                            onClick={addPayment}
                                            className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                            Add Payment
                                        </button>
                                    </div>

                                    {payments.length === 0 ? (
                                        <div className="text-[11px] text-[var(--muted)] text-center py-2 italic bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                                            No payments recorded yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {payments.map((p, idx) => (
                                                <div key={p.id} className="flex flex-col sm:flex-row gap-2 sm:items-center bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--border)] relative group">
                                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <div className="col-span-2 sm:col-span-1">
                                                            <input 
                                                                type="date"
                                                                value={p.date}
                                                                onChange={e => updatePayment(p.id, 'date', e.target.value)}
                                                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <select
                                                                value={p.method}
                                                                onChange={e => updatePayment(p.id, 'method', e.target.value)}
                                                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                                            >
                                                                <option value="Cash">Cash</option>
                                                                <option value="Credit Card">Credit Card</option>
                                                                <option value="Bank Transfer">Bank Transfer</option>
                                                                <option value="Zelle">Zelle</option>
                                                                <option value="Cash App">Cash App</option>
                                                                <option value="Venmo">Venmo</option>
                                                                <option value="Check">Check</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-span-1 relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">$</span>
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={p.amount === 0 ? '' : p.amount}
                                                                onChange={e => updatePayment(p.id, 'amount', Number(e.target.value))}
                                                                placeholder="0.00"
                                                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded pl-5 pr-2 py-1 text-xs outline-none focus:border-blue-500 tabular-nums"
                                                            />
                                                        </div>
                                                        <div className="col-span-2 sm:col-span-1">
                                                            <input 
                                                                type="text"
                                                                value={p.note || ''}
                                                                onChange={e => updatePayment(p.id, 'note', e.target.value)}
                                                                placeholder="Note (e.g. Deposit)"
                                                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => removePayment(p.id)}
                                                        className="absolute -top-2 -right-2 sm:relative sm:top-auto sm:right-auto bg-red-500 text-white rounded-full p-1 sm:bg-transparent sm:text-red-400 sm:hover:text-red-500 sm:hover:bg-red-500/10 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 shadow-md sm:shadow-none"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {totalPaid > 0 && (
                                    <>
                                        <div className="flex justify-between items-end pt-3 mt-2 text-[var(--text)] border-t border-[var(--border)]/50">
                                            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Total Paid</span>
                                            <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--muted)]">-${totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2 text-[var(--text)]">
                                            <span className="font-bold uppercase tracking-wider text-xs text-blue-500">Balance Due</span>
                                            <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-blue-500">${balanceDue.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Internal Notes (Optional)</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any private remarks for this invoice..."
                                rows={2}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 placeholder:text-[var(--muted)]/50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none text-sm"
                            />
                        </div>

                        {/* Attachments Section */}
                        <div className="pt-2">
                            <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Attachments (Photos Only)</label>
                            <label className="flex items-center justify-center w-full min-h-[80px] border-2 border-dashed border-[var(--border)] rounded-2xl cursor-pointer hover:bg-[var(--card)] hover:border-blue-500/50 transition-all text-center p-6 group">
                                <span className="text-sm font-semibold text-[var(--muted)] group-hover:text-blue-500 transition-colors">
                                    Click here to upload photos
                                </span>
                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                            
                            {attachedPhotos.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                                    {attachedPhotos.map((photo, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden shadow-sm border border-[var(--border)] aspect-square bg-[var(--card)]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo} alt="Attachment" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setAttachedPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Sticky Bottom UI Actions Container */}
            <div className="fixed bottom-0 left-0 w-full sm:absolute sm:bottom-auto sm:-bottom-24 bg-[var(--bg)]/90 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t border-[var(--border)] sm:border-none p-4 sm:p-0 z-50 flex flex-col-reverse sm:flex-row justify-between gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none animate-in slide-in-from-bottom-6">
                
                {/* Back Button */}
                <button 
                    onClick={handleBack}
                    disabled={step === 1 || isSaving}
                    className={clsx(
                        "w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold transition-all duration-200 text-sm",
                        step === 1 ? "opacity-0 pointer-events-none" : "bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)]"
                    )}
                >
                    Back
                </button>

                {/* Next / Submit Actions */}
                <div className="flex gap-3 w-full sm:w-auto">
                    {step < 4 ? (
                        <button 
                            onClick={handleNext}
                            className="flex-1 sm:flex-none px-10 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 text-sm flex items-center justify-center gap-2"
                        >
                            Next Step
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={() => handleSubmit('DRAFT')}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none px-6 py-3.5 bg-[var(--card)] border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)] rounded-xl font-bold transition-all text-sm"
                            >
                                {isSaving ? "Saving..." : "Save Draft"}
                            </button>
                            
                            <button 
                                onClick={() => handleSubmit('SENT')}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {isSaving ? "Finalizing..." : isEdit ? "Update Invoice" : "Create Invoice"}
                            </button>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}


```


## src\components\invoices\MobileFilterBar.tsx
```tsx

import Link from 'next/link';
import { clsx } from 'clsx';

export default function MobileFilterBar({ filterParam }: { filterParam: string }) {
    const filters = [
        { id: 'all', label: 'All' },
        { id: 'draft', label: 'Draft' },
        { id: 'sent', label: 'Sent' },
        { id: 'viewed', label: 'Viewed' },
        { id: 'paid', label: 'Paid' },
        { id: 'overdue', label: 'Overdue' },
    ];

    return (
        <div className="w-full -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 scrollbar-hide relative">
            <div className="flex items-center gap-2 min-w-max">
                {filters.map((filter) => {
                    const isActive = filterParam === filter.id;
                    return (
                        <Link 
                            key={filter.id}
                            href={filter.id === 'all' ? '/dashboard/invoices' : `/dashboard/invoices?filter=${filter.id}`}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm",
                                isActive 
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-black" 
                                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-gray-300 dark:hover:border-gray-600"
                            )}
                        >
                            {filter.label}
                        </Link>
                    );
                })}
            </div>
            
            {/* Fade effect for scroll indicating more items */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent pointer-events-none sm:hidden" />
        </div>
    );
}


```


## src\components\invoices\PaymentInsightsCard.tsx
```tsx

'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function PaymentInsightsCard({ invoiceId }: { invoiceId: string }) {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/invoices/${invoiceId}/payment-insights`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setInsights(data.insights);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
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


```


## src\components\invoices\PaymentPlanManager.tsx
```tsx

"use client";

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Installment {
    id?: string;
    label: string | null;
    amount: number;
    dueDate: string | null;
    status: string;
}

interface PaymentPlanManagerProps {
    invoiceId: string;
    invoiceTotal: number;
    initialPlanEnabled: boolean;
    initialInstallments: Installment[];
}

export default function PaymentPlanManager({ invoiceId, invoiceTotal, initialPlanEnabled, initialInstallments }: PaymentPlanManagerProps) {
    const router = useRouter();
    const [enabled, setEnabled] = useState(initialPlanEnabled);
    const [installments, setInstallments] = useState<Installment[]>(initialInstallments || []);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const sumOfInstallments = installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0);
    const isValidTotal = Math.abs(sumOfInstallments - invoiceTotal) < 0.01;
    const hasPaidInstallments = installments.some(i => i.status === 'PAID');

    useEffect(() => {
        // If enabling for the first time and empty, suggest a 50/50 split
        if (enabled && installments.length === 0) {
            setInstallments([
                { label: 'Deposit', amount: Number((invoiceTotal / 2).toFixed(2)), dueDate: '', status: 'UNPAID' },
                { label: 'Final Payment', amount: Number((invoiceTotal - Number((invoiceTotal / 2).toFixed(2))).toFixed(2)), dueDate: '', status: 'UNPAID' }
            ]);
        }
    }, [enabled, installments.length, invoiceTotal]);

    const handleAdd = () => {
        setInstallments([...installments, { label: `Installment ${installments.length + 1}`, amount: 0, dueDate: '', status: 'UNPAID' }]);
    };

    const handleRemove = (index: number) => {
        if (installments[index].status === 'PAID') return;
        const newArr = [...installments];
        newArr.splice(index, 1);
        setInstallments(newArr);
    };

    const handleUpdate = (index: number, field: keyof Installment, value: any) => {
        const newArr = [...installments];
        // Don't allow changing amount of paid
        if (newArr[index].status === 'PAID' && field === 'amount') return;
        newArr[index] = { ...newArr[index], [field]: value };
        setInstallments(newArr);
    };

    const handleSplit = (parts: number) => {
        if (hasPaidInstallments) return;
        const baseAmount = Number((invoiceTotal / parts).toFixed(2));
        const newArr: Installment[] = [];
        let runningTotal = 0;
        
        for (let i = 0; i < parts; i++) {
            const isLast = i === parts - 1;
            const amount = isLast ? Number((invoiceTotal - runningTotal).toFixed(2)) : baseAmount;
            runningTotal += amount;
            newArr.push({
                label: i === 0 ? 'Deposit' : isLast ? 'Final Payment' : `Milestone ${i}`,
                amount: amount,
                dueDate: '',
                status: 'UNPAID'
            });
        }
        setInstallments(newArr);
    };

    const savePlan = async () => {
        if (enabled && !isValidTotal) {
            setError(`Total must equal invoice total ($${invoiceTotal.toFixed(2)}). Currently: $${sumOfInstallments.toFixed(2)}`);
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/invoices/${invoiceId}/installments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentPlanEnabled: enabled,
                    installments: enabled ? installments.map(i => ({ ...i, amount: Number(i.amount) })) : []
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save payment plan');

            setInstallments(data.installments);
            alert('Payment plan updated successfully.');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm mb-8 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border)] pb-4">
                <div>
                    <h3 className="text-lg font-bold text-[var(--text)]">Payment Plan</h3>
                    <p className="text-sm text-[var(--muted)]">Split this invoice into structured installments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[var(--text)]">{enabled ? 'Enabled' : 'Disabled'}</span>
                    <button 
                        onClick={() => {
                            if (hasPaidInstallments && enabled) {
                                alert("Cannot disable plan because some installments are already paid.");
                                return;
                            }
                            setEnabled(!enabled);
                        }}
                        className={clsx("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700")}
                    >
                        <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", enabled ? "translate-x-6" : "translate-x-1")} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm font-medium">
                    {error}
                </div>
            )}

            {enabled && (
                <div className="space-y-4">
                    {!hasPaidInstallments && (
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => handleSplit(2)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">Split 50/50</button>
                            <button onClick={() => handleSplit(3)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">Split into 3</button>
                            <button onClick={() => handleSplit(4)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">Split into 4</button>
                        </div>
                    )}

                    {installments.map((inst, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] relative group">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Label</label>
                                    <input 
                                        type="text" 
                                        value={inst.label || ''} 
                                        onChange={e => handleUpdate(index, 'label', e.target.value)}
                                        placeholder="e.g. Deposit"
                                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={inst.amount === 0 ? '' : inst.amount} 
                                            onChange={e => handleUpdate(index, 'amount', e.target.value)}
                                            disabled={inst.status === 'PAID'}
                                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-6 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text)] disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Due Date</label>
                                    <input 
                                        type="date" 
                                        value={inst.dueDate ? inst.dueDate.split('T')[0] : ''} 
                                        onChange={e => handleUpdate(index, 'dueDate', e.target.value)}
                                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text)] [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 mt-2 sm:mt-5">
                                <span className={clsx("text-xs font-bold px-2 py-1 rounded-md", 
                                    inst.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" : 
                                    inst.status === 'PAYMENT_PENDING' ? "bg-yellow-500/10 text-yellow-500" : 
                                    "bg-gray-500/10 text-gray-500"
                                )}>
                                    {inst.status}
                                </span>
                                
                                {inst.status !== 'PAID' && (
                                    <button 
                                        onClick={() => handleRemove(index)}
                                        className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                                        title="Remove Installment"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-between items-center pt-4">
                        <button 
                            onClick={handleAdd}
                            className="text-sm font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Add Custom Installment
                        </button>
                        
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Sum of Installments</span>
                            <span className={clsx("text-lg font-black tabular-nums tracking-tight", isValidTotal ? "text-emerald-500" : "text-red-500")}>
                                ${sumOfInstallments.toFixed(2)} <span className="text-sm text-[var(--muted)] font-medium">/ ${invoiceTotal.toFixed(2)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 border-t border-[var(--border)] pt-4 flex justify-end">
                <button 
                    onClick={savePlan}
                    disabled={isSaving || (enabled && !isValidTotal)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                    {isSaving ? 'Saving...' : 'Save Payment Plan'}
                </button>
            </div>
        </div>
    );
}


```


## src\components\invoices\PublicInvoiceViewer.tsx
```tsx

"use client";

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import InvoiceDocument from './InvoiceDocument';
import SignaturePad from '../ui/SignaturePad';

interface PublicInvoice {
    id: string;
    invoiceNumber: string | null;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    clientPhone: string | null;
    clientAddress: string | null;
    clientPropertyAddress: string | null;
    title: string;
    description: string | null;
    currency: string;
    subtotal: number;
    discountType?: string;
    discountValue?: number;
    tax: number;
    total: number;
    issueDate: string;
    dueDate: string | null;
    notes: string | null;
    attachedPhotos?: any;
    status: string;
    isConverted: boolean;
    paymentConfirmed: boolean;
    paymentConfirmedAt: string | null;
    createdAt: string;
    businessName?: string | null;
    businessEmail?: string | null;
    businessPhone?: string | null;
    businessAddress?: string | null;
    businessLogoPath?: string | null;
    businessRegistrationNumber?: string | null;
    authorizedSignature?: string | null;
    publicToken?: string | null;
    ownerIsPro?: boolean;
    acceptOnlinePayment?: boolean;
    paymentStatus?: string;
    amountPaid?: number;
    remainingBalance?: number;
    viewCount: number;
    lastViewedAt: string | null;
    sentAt: string | null;
    depositAmount?: number;
    paymentMethod?: string | null;
    payments?: any;
    onlinePayments?: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        paymentMethod: string | null;
        payerName: string | null;
        payerEmail: string | null;
        createdAt: string;
    }[];
    convertedReceiptId?: string | null;
    items: {
        id: string;
        name: string;
        description: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    paymentPlanEnabled?: boolean;
    installments?: {
        id: string;
        label: string | null;
        amount: number;
        dueDate: string | null;
        status: string;
    }[];
}

export default function PublicInvoiceViewer({ token, isAuthenticated = false }: { token: string; isAuthenticated?: boolean }) {
    const router = useRouter();
    const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    const handleSign = async (dataUrl: string) => {
        setIsSigning(true);
        try {
            const res = await fetch(`/api/public/invoice/${token}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature: dataUrl })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save signature.');
            }
            // Update local state to reveal payment buttons
            setInvoice(prev => prev ? { ...prev, authorizedSignature: dataUrl } : null);
            setShowSignatureModal(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSigning(false);
        }
    };


    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await fetch(`/api/public/invoice/${token}`);
                const data = await res.json();
                
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to open invoice. The link may be invalid.');
                }
                
                setInvoice(data.invoice);

                // Non-blocking background tracking (Exclude bots & PDF generator)
                const userAgent = navigator.userAgent.toLowerCase();
                const isBot = /bot|googlebot|crawler|spider|robot|crawling|headlesschrome|puppeteer|verihub-pdf/i.test(userAgent);
                if (!isBot) {
                    fetch(`/api/public/invoice/${token}/track`, { method: 'POST' }).catch(() => {});
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();
    }, [token]);

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pt-8 sm:pt-16 pb-24 px-4 sm:px-6 animate-pulse">
                <div className="bg-white dark:bg-[var(--card)] rounded-3xl shadow-xl overflow-hidden flex flex-col relative ring-1 ring-black/5 dark:ring-white/5">
                    <div className="px-6 py-8 sm:p-10 border-b border-gray-100 dark:border-[var(--border)] bg-gray-50/50 dark:bg-black/20 flex flex-col sm:flex-row justify-between gap-6">
                        <div className="space-y-4 w-full max-w-sm">
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-32"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        </div>
                        <div className="space-y-3 w-full sm:w-48 text-right">
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-16 ml-auto"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                        </div>
                    </div>
                    <div className="px-6 py-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-transparent border-b border-gray-100 dark:border-[var(--border)]">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                    </div>
                    <div className="px-6 py-8 sm:px-10 flex-1 bg-white dark:bg-transparent min-h-[300px]">
                        <div className="space-y-6">
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-inner ring-1 ring-red-500/20">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-xl font-bold text-[var(--text)] mb-3">Link Invalid or Expired</h1>
                <p className="text-sm text-[var(--muted)] mb-8 leading-relaxed">
                    {error || 'This secure invoice link is no longer active. Please request a new link from the sender.'}
                </p>
            </div>
        );
    }

    const isPaid = invoice.status === 'PAID';
    const statusIndex = invoice.status === 'PAID' ? 3 : invoice.status === 'VIEWED' ? 2 : invoice.status === 'SENT' ? 1 : 0;

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pt-4 sm:pt-8 bg-gray-50/50 dark:bg-[#0b1220] print:bg-white print:dark:bg-white">
            
            {/* Owner Analytics Banner */}
            {isAuthenticated && (
                <div className="w-full px-4 sm:px-6 mb-4 print:hidden animate-in slide-in-from-top-4 fade-in">
                    <div className="flex flex-col bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 sm:p-5 gap-6">
                        
                        {/* Header & Metrics */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Invoice Lifecycle</h3>
                                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 font-medium mt-0.5">
                                        {invoice.status === 'SENT' && invoice.viewCount === 0 && invoice.sentAt && (Date.now() - new Date(invoice.sentAt).getTime() > 24 * 60 * 60 * 1000) ? (
                                            <span className="text-red-500 font-bold">Not yet viewed (over 24h)</span>
                                        ) : invoice.status === 'VIEWED' ? (
                                            <span className="text-purple-600 dark:text-purple-400 font-bold">Client has viewed this invoice</span>
                                        ) : (
                                            "Analytics are hidden from clients."
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto bg-white/60 dark:bg-black/20 rounded-xl p-2.5 sm:px-4 sm:py-2 border border-indigo-100 dark:border-white/5">
                                <div className="flex flex-col relative group">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Views</span>
                                        <span title="Views exclude PDF generation and common social preview bots.">
                                            <svg className="w-3 h-3 text-[var(--muted)]/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--text)] tabular-nums">{invoice.viewCount || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Timeline */}
                        <div className="w-full flex items-start justify-between relative mt-2 px-2 sm:px-8">
                            {/* Draft */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 0 ? "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-500/20" : "bg-indigo-200 dark:bg-indigo-500/40 text-indigo-700 dark:text-indigo-200 ring-indigo-50 dark:ring-indigo-500/10")}>
                                    {statusIndex > 0 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 0 ? "text-indigo-900 dark:text-indigo-300" : "text-indigo-700 dark:text-indigo-400")}>Draft</span>
                                    {invoice.createdAt && <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true })}</span>}
                                </div>
                                <div className={clsx("absolute top-3 left-1/2 w-full h-[2px] -z-10", statusIndex > 0 ? "bg-indigo-200 dark:bg-indigo-500/40" : "bg-indigo-100 dark:bg-white/5")} />
                            </div>

                            {/* Sent */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 1 ? "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-500/20" : statusIndex > 1 ? "bg-indigo-200 dark:bg-indigo-500/40 text-indigo-700 dark:text-indigo-200 ring-indigo-50 dark:ring-indigo-500/10" : "bg-white dark:bg-black/20 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 ring-transparent")}>
                                    {statusIndex > 1 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 1 ? "text-indigo-900 dark:text-indigo-300" : statusIndex > 1 ? "text-indigo-700 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")}>Sent</span>
                                    {invoice.sentAt && <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.sentAt), { addSuffix: true })}</span>}
                                </div>
                                <div className={clsx("absolute top-3 left-1/2 w-full h-[2px] -z-10", statusIndex > 1 ? "bg-indigo-200 dark:bg-indigo-500/40" : "bg-indigo-100 dark:bg-white/5")} />
                            </div>

                            {/* Viewed */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 2 ? "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-500/20" : statusIndex > 2 ? "bg-indigo-200 dark:bg-indigo-500/40 text-indigo-700 dark:text-indigo-200 ring-indigo-50 dark:ring-indigo-500/10" : "bg-white dark:bg-black/20 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 ring-transparent")}>
                                    {statusIndex > 2 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 2 ? "text-indigo-900 dark:text-indigo-300" : statusIndex > 2 ? "text-indigo-700 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")}>Viewed</span>
                                    {invoice.lastViewedAt && <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.lastViewedAt), { addSuffix: true })}</span>}
                                </div>
                                <div className={clsx("absolute top-3 left-1/2 w-full h-[2px] -z-10", statusIndex > 2 ? "bg-indigo-200 dark:bg-indigo-500/40" : "bg-indigo-100 dark:bg-white/5")} />
                            </div>

                            {/* Paid */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 3 ? "bg-emerald-500 text-white ring-emerald-100 dark:ring-emerald-500/20" : "bg-white dark:bg-black/20 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 ring-transparent")}>
                                    {statusIndex === 3 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 3 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500")}>Paid</span>
                                    {invoice.paymentConfirmedAt && <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.paymentConfirmedAt), { addSuffix: true })}</span>}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Print Toolbar & Exit Action */}
            <div className="w-full flex justify-between items-center px-4 sm:px-6 mb-4 print:hidden">
                <button
                    onClick={() => {
                        if (isAuthenticated) {
                            router.push('/dashboard/invoices');
                        } else {
                            router.push('/');
                        }
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[var(--card)] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white ring-1 ring-black/5 dark:ring-white/10 shadow-sm transition-all"
                    title="Close Viewer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-center gap-3">
                    <a 
                        href={`/api/public/invoice/${token}/pdf`}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl shadow-sm transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden sm:inline">Download PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </a>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[var(--card)] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-[var(--text)] text-sm font-bold rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full flex flex-col pb-24 px-4 sm:px-6 print:p-0 print:m-0 print:block">
            
            <InvoiceDocument 
                invoice={invoice} 
                onSignatureClick={!invoice.authorizedSignature ? () => setShowSignatureModal(true) : undefined} 
            />
            
            {/* --- PAYMENT HISTORY (OWNER ONLY) --- */}
            {isAuthenticated && invoice.onlinePayments && invoice.onlinePayments.length > 0 && (
                <div className="mt-8 bg-white dark:bg-[#0b1220] rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-black/5 dark:ring-white/10 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Payment Activity</h3>
                    <div className="space-y-4">
                        {invoice.onlinePayments.map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/5">
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">${payment.amount.toFixed(2)} {payment.currency}</div>
                                    <div className="text-xs text-gray-500 dark:text-[var(--muted)] mt-1">
                                        {format(new Date(payment.createdAt), 'MMM d, yyyy h:mm a')} • {payment.paymentMethod || 'Stripe'}
                                    </div>
                                    {(payment.payerName || payment.payerEmail) && (
                                        <div className="text-xs text-gray-500 dark:text-[var(--muted)] mt-1">
                                            By: {payment.payerName || payment.payerEmail}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <span className={clsx(
                                        "px-2.5 py-1 rounded-full text-xs font-bold",
                                        payment.status === 'SUCCEEDED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                        payment.status === 'PENDING' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                                        "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                    )}>
                                        {payment.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- ONLINE PAYMENT CTA OR SIGNATURE PAD --- */}
            {invoice.ownerIsPro && invoice.acceptOnlinePayment && invoice.paymentStatus !== 'PAID' && (invoice.remainingBalance || 0) > 0 && (
                <>
                    {!invoice.authorizedSignature ? (
                        <div className="mt-8 bg-indigo-600 dark:bg-indigo-500 rounded-3xl shadow-xl shadow-indigo-600/20 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden text-white flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="text-center sm:text-left relative z-10">
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
                                    Signature Required
                                </h3>
                                <p className="text-indigo-100 font-medium text-sm max-w-md">
                                    Please provide your authorized signature on the document to approve this invoice and unlock secure online payment.
                                </p>
                            </div>
                            <div className="w-full sm:w-auto relative z-10 flex flex-col items-center sm:items-end gap-2">
                                <button
                                    onClick={() => setShowSignatureModal(true)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-600 shadow-lg shadow-black/10 text-base font-black rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Sign Invoice Now
                                </button>
                            </div>
                        </div>
                    ) : invoice.paymentPlanEnabled && invoice.installments && invoice.installments.length > 0 ? (
                        <div className="mt-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl shadow-xl shadow-indigo-600/5 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden border border-indigo-100 dark:border-indigo-500/20">
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-6 text-indigo-900 dark:text-indigo-300">
                                Payment Schedule
                            </h3>
                            <div className="space-y-4">
                                {invoice.installments.map((inst, index) => (
                                    <div key={inst.id} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0b1220] ring-1 ring-black/5 dark:ring-white/10 shadow-sm">
                                        <div className="flex-1 text-center sm:text-left">
                                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                                                {inst.label || `Installment ${index + 1}`}
                                            </div>
                                            {inst.dueDate && (
                                                <div className="text-sm text-gray-500 dark:text-[var(--muted)] mt-1">
                                                    Due: {format(new Date(inst.dueDate), 'MMM d, yyyy')}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="text-xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white">
                                            ${inst.amount.toFixed(2)}
                                        </div>
                                        
                                        <div className="w-full sm:w-auto mt-2 sm:mt-0 flex justify-center">
                                            {inst.status === 'PAID' ? (
                                                <span className="px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold rounded-xl text-sm w-full sm:w-auto text-center">
                                                    Paid
                                                </span>
                                            ) : inst.status === 'PAYMENT_PENDING' ? (
                                                <span className="px-4 py-2 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-bold rounded-xl text-sm w-full sm:w-auto text-center">
                                                    Pending
                                                </span>
                                            ) : (
                                                <button
                                                    disabled={isCheckoutLoading}
                                                    onClick={async () => {
                                                        setIsCheckoutLoading(true);
                                                        try {
                                                            const res = await fetch(`/api/public/invoice/${token}/create-checkout-session`, { 
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ installmentId: inst.id })
                                                            });
                                                            const data = await res.json();
                                                            if (!res.ok || !data.success) {
                                                                throw new Error(data.error || 'Failed to initialize secure checkout.');
                                                            }
                                                            if (data.url) {
                                                                window.location.href = data.url;
                                                            }
                                                        } catch (e: any) {
                                                            alert(e.message);
                                                        } finally {
                                                            setIsCheckoutLoading(false);
                                                        }
                                                    }}
                                                    className={clsx("w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20", isCheckoutLoading && "opacity-70 cursor-not-allowed")}
                                                >
                                                    Pay
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8 bg-indigo-600 dark:bg-indigo-500 rounded-3xl shadow-xl shadow-indigo-600/20 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden text-white flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="text-center sm:text-left relative z-10">
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
                                    {invoice.paymentStatus === 'PARTIAL_PAID' ? 'Complete Your Payment' : 'Secure Online Payment'}
                                </h3>
                                <p className="text-indigo-100 font-medium text-sm max-w-md">
                                    {invoice.paymentStatus === 'PARTIAL_PAID' ? 
                                        `You have a remaining balance of $${(invoice.remainingBalance || 0).toFixed(2)}. Pay securely via Stripe.` : 
                                        'Pay securely with any major credit card via Stripe. Your payment will be instantly verified and a receipt will be generated.'}
                                </p>
                            </div>
                            
                            <div className="w-full sm:w-auto relative z-10 flex flex-col items-center sm:items-end gap-2">
                                <div className="text-2xl font-black tabular-nums tracking-tight mb-1">
                                    ${(invoice.remainingBalance || 0).toFixed(2)}
                                </div>
                                <button
                                    disabled={isCheckoutLoading}
                                    onClick={async () => {
                                        setIsCheckoutLoading(true);
                                        try {
                                            const res = await fetch(`/api/public/invoice/${token}/create-checkout-session`, { method: 'POST' });
                                            const data = await res.json();
                                            if (!res.ok || !data.success) {
                                                throw new Error(data.error || 'Failed to initialize secure checkout.');
                                            }
                                            if (data.url) {
                                                window.location.href = data.url;
                                            }
                                        } catch (e: any) {
                                            alert(e.message);
                                        } finally {
                                            setIsCheckoutLoading(false);
                                        }
                                    }}
                                    className={clsx("w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-600 shadow-lg shadow-black/10 text-base font-black rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl", isCheckoutLoading && "opacity-70 cursor-not-allowed")}
                                >
                                    {isCheckoutLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                            Pay {invoice.paymentStatus === 'PARTIAL_PAID' ? 'Balance' : 'Invoice'} Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* --- PAID IN FULL CTA --- */}
            {invoice.paymentStatus === 'PAID' && (
                 <div className="mt-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl ring-1 ring-emerald-500/20 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden text-emerald-900 dark:text-emerald-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Paid in Full</h3>
                        </div>
                        <p className="text-emerald-700/80 dark:text-emerald-200/70 font-medium text-sm">
                            Thank you! This invoice has been fully paid.
                        </p>
                    </div>
                    {invoice.convertedReceiptId && (
                        <a
                            href={isAuthenticated ? `/dashboard/receipts/view/${invoice.convertedReceiptId}` : undefined} // If public, maybe no link or generic
                            onClick={(e) => {
                                if (!isAuthenticated) {
                                    e.preventDefault();
                                    alert('Receipt is generated and stored securely by the issuer.');
                                }
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 text-base font-black rounded-2xl transition-all"
                        >
                            View Receipt
                        </a>
                    )}
                 </div>
            )}

            {/* --- SHARE & DISTRIBUTION LAYER (SCREEN ONLY) --- */}
            <div className="mt-8 bg-white dark:bg-[#0b1220] rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-black/5 dark:ring-white/10 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Share this Invoice</h3>
                        <p className="text-sm text-gray-500 dark:text-[var(--muted)]">Send a secure link to your client or download it directly.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                navigator.clipboard.writeText(url);
                                alert('Invoice link copied to clipboard!');
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-[var(--text)] text-sm font-bold rounded-xl transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Copy Link
                        </button>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                if (navigator.share) {
                                    navigator.share({ title: invoice.title, url });
                                } else {
                                    navigator.clipboard.writeText(url);
                                    alert('Invoice link copied to clipboard!');
                                }
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 text-sm font-bold rounded-xl transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Share
                        </button>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                window.open(`mailto:?subject=${encodeURIComponent('Invoice from ' + (invoice.businessName || 'Verihub'))}&body=${encodeURIComponent('View your invoice securely online:\n' + url)}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title="Share via Email"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </button>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('View your invoice from ' + (invoice.businessName || 'Verihub'))}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors"
                            title="Share on X"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </button>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Share on Facebook"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                        </button>
                    </div>
                    
                    <a 
                        href={`/api/public/invoice/${token}/pdf`}
                        download
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl transition-all w-full sm:w-auto"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download PDF
                    </a>
                </div>
            </div>

            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-8 w-full max-w-lg relative animate-in zoom-in-95">
                        <button 
                            onClick={() => setShowSignatureModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Sign Document</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Draw your signature below to authorize this invoice.</p>
                        <SignaturePad onSign={handleSign} />
                    </div>
                </div>
            )}

            {/* Verihub CTA (Watermark Footer) */}
            <div className="mt-16 flex flex-col items-center justify-center text-center pb-8 transition-all duration-500 print:hidden">
                <div className="flex flex-col items-center gap-4 bg-white/60 dark:bg-black/20 p-8 rounded-3xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-md max-w-sm w-full shadow-lg shadow-black/5">
                    <img src="/assets/text-logo.png" alt="Verihub" className="h-6 w-auto dark:invert mb-1" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Start using Verihub</h4>
                    <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium px-4">Create, track, and get paid with secure professional invoices.</p>
                    <Link href="/register" className="w-full mt-4 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                        Create your own invoices
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </Link>
                </div>
            </div>

            </div>
        </div>
    );
}


```


## src\app\invoice\[token]\page.tsx
```tsx

import PublicInvoiceViewer from '@/components/invoices/PublicInvoiceViewer';
import { cookies } from 'next/headers';

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const cookieStore = await cookies();
    const isAuthenticated = !!cookieStore.get('auth_token')?.value;

    return (
        <div className="min-h-screen bg-[#f3f4f6] dark:bg-[var(--bg)] font-sans flex flex-col selection:bg-blue-500/30">
            <PublicInvoiceViewer token={token} isAuthenticated={isAuthenticated} />
        </div>
    );
}


```


## src\app\invoice\[token]\bundle\page.tsx
```tsx

import { db as prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import { format } from 'date-fns';

export default async function InvoiceBundlePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    
    const invoice = await prisma.invoice.findUnique({
        where: { publicToken: token },
        include: { 
            items: true, 
            user: true,
            onlinePayments: {
                orderBy: { createdAt: 'desc' }
            },
            installments: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!invoice || invoice.status !== 'PAID') {
        notFound();
    }

    const safeInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientCompany: invoice.clientCompany,
        clientPhone: invoice.clientPhone,
        clientAddress: invoice.clientAddress,
        clientPropertyAddress: invoice.clientPropertyAddress,
        title: invoice.title,
        description: invoice.description,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue ?? undefined,
        tax: invoice.tax || 0,
        total: invoice.total,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        notes: invoice.notes,
        status: invoice.status,
        viewCount: invoice.viewCount,
        lastViewedAt: invoice.lastViewedAt,
        createdAt: invoice.createdAt,
        sentAt: invoice.sentAt,
        isConverted: invoice.isConverted,
        paymentConfirmed: invoice.paymentConfirmed,
        paymentConfirmedAt: invoice.paymentConfirmedAt ? invoice.paymentConfirmedAt.toISOString() : null,
        authorizedSignature: invoice.authorizedSignature,
        
        acceptOnlinePayment: invoice.acceptOnlinePayment,
        paymentStatus: invoice.paymentStatus,
        amountPaid: invoice.amountPaid,
        remainingBalance: invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0)),
        convertedReceiptId: invoice.convertedReceiptId,
        
        publicToken: invoice.publicToken,
        ownerIsPro: (invoice.user?.plan === 'PRO' && invoice.user?.planStatus !== 'inactive') || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN',
        businessName: invoice.user?.businessName || invoice.user?.name || invoice.user?.email?.split('@')[0] || null,
        businessEmail: invoice.user?.email || null,
        businessPhone: invoice.user?.businessPhone || null,
        businessAddress: invoice.user?.businessAddress || null,
        businessLogoPath: (invoice.user?.plan === 'PRO' || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN') ? invoice.user?.businessLogoPath : null,
        businessRegistrationNumber: invoice.user?.businessRegistrationNumber || null,
        attachedPhotos: invoice.attachedPhotos,
        depositAmount: invoice.depositAmount ?? undefined,
        paymentMethod: invoice.paymentMethod,
        payments: Array.isArray(invoice.payments) ? (invoice.payments as any) : undefined,
        onlinePayments: invoice.onlinePayments,
        paymentPlanEnabled: invoice.paymentPlanEnabled,
        installments: invoice.installments.map(i => ({
            id: i.id,
            label: i.label,
            amount: i.amount,
            dueDate: i.dueDate,
            status: i.status,
            paidAt: i.paidAt
        })),
        items: invoice.items.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total
        }))
    };

    return (
        <div className="min-h-screen bg-white text-black p-8 font-sans print:p-0">
            {/* Print action bar (hidden when printing) */}
            <div className="flex justify-end mb-8 print:hidden">
                <button 
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print Bundle
                </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-16">
                
                {/* 1. Official Invoice Document */}
                <div className="print-page border-b border-gray-200 pb-16 print:border-none print:pb-0">
                    <InvoiceDocument invoice={safeInvoice} />
                </div>

                {/* 2. Official Payment Receipt Summary */}
                <div className="print-page pt-16 print:pt-0">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Payment Receipt</h1>
                        <p className="text-gray-500 font-medium mt-2">Document Ref: {invoice.invoiceNumber || invoice.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Paid To</h3>
                            <div className="font-bold text-gray-900 text-lg">{safeInvoice.businessName}</div>
                            <div className="text-gray-600 mt-1">{safeInvoice.businessEmail}</div>
                            {safeInvoice.businessPhone && <div className="text-gray-600">{safeInvoice.businessPhone}</div>}
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Paid By</h3>
                            <div className="font-bold text-gray-900 text-lg">{safeInvoice.clientCompany || safeInvoice.clientName}</div>
                            {safeInvoice.clientCompany && <div className="text-gray-600 mt-1">{safeInvoice.clientName}</div>}
                            <div className="text-gray-600">{safeInvoice.clientEmail}</div>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Transaction History</h3>
                        
                        <div className="space-y-3">
                            {safeInvoice.onlinePayments && safeInvoice.onlinePayments.length > 0 ? (
                                safeInvoice.onlinePayments.map((payment: any) => (
                                    <div key={payment.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <div>
                                            <div className="font-bold text-gray-900">{format(new Date(payment.createdAt), 'MMMM d, yyyy h:mm a')}</div>
                                            <div className="text-sm text-gray-500">{payment.paymentMethod || 'Online Payment'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">${payment.amount.toFixed(2)}</div>
                                            <div className="text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded uppercase mt-1">{payment.status}</div>
                                        </div>
                                    </div>
                                ))
                            ) : safeInvoice.installments && safeInvoice.installments.length > 0 ? (
                                safeInvoice.installments.map((inst: any) => (
                                    <div key={inst.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <div>
                                            <div className="font-bold text-gray-900">{inst.label || 'Installment'}</div>
                                            <div className="text-sm text-gray-500">{inst.paidAt ? format(new Date(inst.paidAt), 'MMMM d, yyyy h:mm a') : 'Manual/Cash Payment'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">${inst.amount.toFixed(2)}</div>
                                            <div className="text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded uppercase mt-1">PAID</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 italic py-4">Paid via external/manual method.</div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <div className="bg-gray-900 text-white p-6 rounded-2xl w-full max-w-sm">
                            <div className="flex justify-between items-center mb-2 text-gray-400">
                                <span>Total Amount</span>
                                <span>${safeInvoice.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-2xl text-emerald-400 mt-4 pt-4 border-t border-gray-700">
                                <span>Balance Due</span>
                                <span>$0.00</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Inject print styles directly for page breaks */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    .print-page {
                        page-break-after: always;
                    }
                    .print-page:last-child {
                        page-break-after: auto;
                    }
                }
            `}} />
        </div>
    );
}


```


## prisma/schema.prisma
```prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                       String                    @id @default(cuid())
  email                    String                    @unique
  password                 String
  role                     String                    @default("USER")
  createdAt                DateTime                  @default(now())
  lastSeenChangelogVersion String?
  isActivated              Boolean                   @default(true)
  isEarlyAccess            Boolean                   @default(false)
  activatedAt              DateTime?
  activationSource         String?
  activationTransactionId  String?
  businessAddress          String?
  businessName             String?
  businessPhone            String?
  businessLogoPath         String?
  businessRegistrationNumber String?
  name                     String?
  theme                    String                    @default("dark")
  timezone                 String                    @default("America/New_York")
  plan                     Plan                      @default(CORE)
  planStatus               String?
  planExpiresAt            DateTime?
  stripeCustomerId         String?                   @unique
  stripeSubscriptionId     String?                   @unique
  stripePriceId            String?
  subscriptionStatus       String?
  currentPeriodEnd         DateTime?
  notifyConnectionRequests Boolean                   @default(true)
  notifyConnectionAccepted Boolean                   @default(true)
  notifyMessages           Boolean                   @default(true)
  notifySystem             Boolean                   @default(true)
  agingDigestEnabled       Boolean                   @default(true)
  bundles                  Bundle[]
  categories               Category[]
  receivedConnections      Connection[]              @relation("Receiver")
  sentConnections          Connection[]              @relation("Requester")
  conversationParticipants ConversationParticipant[]
  feedbacks                Feedback[]
  sentMessages             Message[]                 @relation("Sender")
  notifications            Notification[]
  pollVotes                PollVote[]
  receipts                 Receipt[]
  savedReceiptItems        SavedReceiptItem[]
  invoices                 Invoice[]
  customerContacts         CustomerContact[]
  customerNotes            CustomerContactNote[]
  customerTags             CustomerTag[]
  customerCommunicationLogs CustomerCommunicationLog[]
  customerCampaigns        CustomerEmailCampaign[]
  pushTokens               PushToken[]
  veroLensSessions         VeroLensSession[]
  veroLensPricingPresets   VeroLensPricingPreset[]
  veroLensCustomContexts   VeroLensCustomContext[]
}

model Category {
  id        String    @id @default(cuid())
  name      String
  userId    String?
  color     String?
  createdAt DateTime  @default(now())
  user      User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  receipts  Receipt[]

  @@unique([name, userId])
}

model Receipt {
  id              String              @id @default(cuid())
  receiptNumber   String?
  sequenceNumber  Int?
  userId          String
  categoryId      String?
  imageUrl        String?
  date            DateTime
  clientName      String?
  notes           String?
  taxType         String              @default("none")
  taxValue        Float?
  discountType    String              @default("none")
  discountValue   Float?
  subtotal        Float               @default(0)
  total           Float               @default(0)
  createdAt       DateTime            @default(now())
  fileSize        Int?
  isFinalized     Boolean             @default(false)
  finalizedAt     DateTime?
  parentReceiptId String?
  versionNumber   Int                 @default(1)
  ocrNormalized   Json?
  sourceType      String?             @default("manual")
  sourceInvoiceId String?             @unique
  bundles         BundleReceipt[]
  messages        MessageAttachment[]
  category        Category?           @relation(fields: [categoryId], references: [id])
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  items           ReceiptItem[]

  @@unique([userId, receiptNumber])
}

model ReceiptItem {
  id          String  @id @default(cuid())
  receiptId   String
  description String
  quantity    Int
  unitPrice   Float
  lineTotal   Float
  receipt     Receipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)
}

model BusinessProfile {
  id              String  @id @default(cuid())
  businessName    String
  businessAddress String?
  businessPhone   String?
  businessEmail   String?
  logoPath                 String?
  businessRegistrationNumber String?
}

model Connection {
  id          String   @id @default(cuid())
  requesterId String
  receiverId  String
  status      String   @default("pending")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  receiver    User     @relation("Receiver", fields: [receiverId], references: [id], onDelete: Cascade)
  requester   User     @relation("Requester", fields: [requesterId], references: [id], onDelete: Cascade)

  @@unique([requesterId, receiverId])
}

model Conversation {
  id           String                    @id @default(cuid())
  createdAt    DateTime                  @default(now())
  updatedAt    DateTime                  @updatedAt
  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String       @id @default(cuid())
  conversationId String
  userId         String
  joinedAt       DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
}

model Message {
  id             String              @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  type           String              @default("TEXT")
  metadata       Json?
  createdAt      DateTime            @default(now())
  deliveredAt    DateTime?
  readAt         DateTime?
  conversation   Conversation        @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         User                @relation("Sender", fields: [senderId], references: [id], onDelete: Cascade)
  attachments    MessageAttachment[]
}

model MessageAttachment {
  id           String         @id @default(cuid())
  messageId    String
  type         AttachmentType @default(RECEIPT)
  receiptId    String?
  bundleName   String?
  snapshotData Json?
  createdAt    DateTime       @default(now())
  message      Message        @relation(fields: [messageId], references: [id], onDelete: Cascade)
  receipt      Receipt?       @relation(fields: [receiptId], references: [id], onDelete: Cascade)
}

model Bundle {
  id          String          @id @default(cuid())
  name        String
  description String?
  userId      String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  receipts    BundleReceipt[]
}

model BundleReceipt {
  id        String   @id @default(cuid())
  bundleId  String
  receiptId String
  addedAt   DateTime @default(now())
  bundle    Bundle   @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  receipt   Receipt  @relation(fields: [receiptId], references: [id], onDelete: Cascade)

  @@unique([bundleId, receiptId])
}

model SavedReceiptItem {
  id             String   @id @default(cuid())
  userId         String
  name           String
  normalizedName String
  usageCount     Int      @default(1)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, normalizedName])
  @@index([userId, normalizedName])
}

model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Feedback {
  id          String   @id @default(cuid())
  userId      String
  type        String
  message     String
  rating      Int?
  isApproved  Boolean  @default(false)
  isShowcased Boolean  @default(false)
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([type])
  @@index([isShowcased])
}

model Poll {
  id          String       @id @default(cuid())
  question    String
  description String?
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  options     PollOption[]
  votes       PollVote[]
}

model PollOption {
  id     String     @id @default(cuid())
  pollId String
  text   String
  poll   Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes  PollVote[]
}

model PollVote {
  id        String     @id @default(cuid())
  pollId    String
  optionId  String
  userId    String
  createdAt DateTime   @default(now())
  option    PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([pollId, userId])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  link      String?
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([read])
  @@index([createdAt])
}

model Announcement {
  id        String   @id @default(cuid())
  title     String
  content   String
  type      String   @default("ANNOUNCEMENT")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model HeroImage {
  id             String   @id @default(cuid())
  pageKey        String   @unique
  imageUrl       String
  overlayOpacity Float    @default(0.55)
  blurStrength   Float    @default(6)
  title          String?
  subtitle       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model BroadcastMessage {
  id            String   @id @default(cuid())
  title         String
  message       String
  type          BroadcastType @default(INFO)
  target        BroadcastTarget @default(ALL_USERS)
  createdBy     String
  createdAt     DateTime @default(now())
  expiresAt     DateTime?
  isActive      Boolean @default(true)
  dismissible   Boolean @default(true)
  viewCount     Int @default(0)

  @@index([isActive])
  @@index([createdAt])
}

model BroadcastDismissal {
  id          String @id @default(cuid())
  userId      String
  broadcastId String
  dismissedAt DateTime @default(now())

  @@unique([userId, broadcastId])
}

enum BroadcastType {
  INFO
  UPDATE
  WARNING
  SUCCESS
}

enum BroadcastTarget {
  ALL_USERS
  FREE_USERS
  PRO_USERS
  BUSINESS_USERS
}

enum Plan {
  CORE
  PRO
}

enum AttachmentType {
  RECEIPT
  BUNDLE_SNAPSHOT
}

enum NotificationType {
  CONNECTION_REQUEST
  CONNECTION_ACCEPTED
  MESSAGE_RECEIVED
  SYSTEM
  ADMIN
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  CANCELLED
}

model Invoice {
  id                 String            @id @default(cuid())
  invoiceNumber      String?
  sequenceNumber     Int?
  userId             String
  customerContactId  String?
  customerContact    CustomerContact?  @relation(fields: [customerContactId], references: [id], onDelete: SetNull)
  clientName         String
  clientEmail        String?
  clientCompany      String?
  clientPhone        String?
  clientAddress      String?
  clientPropertyAddress String?
  title              String
  description        String?
  status             InvoiceStatus     @default(DRAFT)
  currency           String            @default("USD")
  discountType       String            @default("none")
  discountValue      Float?
  subtotal           Float
  tax                Float?
  total              Float
  depositAmount      Float?            @default(0)
  paymentMethod      String?
  issueDate          DateTime
  dueDate            DateTime?
  notes              String?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  viewCount          Int               @default(0)
  lastViewedAt       DateTime?
  sentAt             DateTime?
  isConverted        Boolean           @default(false)
  convertedReceiptId String?
  publicToken        String?           @unique
  publicTokenExpiresAt DateTime?
  paymentConfirmed   Boolean           @default(false)
  paymentConfirmedAt DateTime?
  authorizedSignature String?
  paymentMethodNote  String?
  attachedPhotos     Json?             @default("[]")
  payments           Json?             @default("[]")
  
  acceptOnlinePayment Boolean          @default(false)
  paymentStatus       String           @default("UNPAID")
  stripeCheckoutSessionId String?
  stripePaymentIntentId String?
  amountPaid          Float            @default(0)
  remainingBalance    Float?
  paymentEnabledAt    DateTime?
  lastPaymentAt       DateTime?
  
  // Payment Reminders
  paymentReminderEnabled Boolean       @default(false)
  lastPaymentReminderAt  DateTime?
  paymentReminderCount   Int           @default(0)
  
  // Installments
  paymentPlanEnabled  Boolean          @default(false)
  installments        InvoiceInstallment[]
  
  onlinePayments      InvoicePayment[]
  paymentRequestLogs  InvoicePaymentRequestLog[]
  analyticsEvents     InvoicePaymentAnalyticsEvent[]
  
  user               User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  items              InvoiceLineItem[]

  @@index([userId])
  @@index([status])
  @@index([paymentStatus])
  @@index([dueDate])
  @@index([customerContactId])
  @@index([publicToken])
  @@index([createdAt])
  @@unique([userId, invoiceNumber])
}

model InvoiceLineItem {
  id          String   @id @default(cuid())
  invoiceId   String
  name        String
  description String?
  quantity    Int
  unitPrice   Float
  total       Float
  
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}

model InvoicePayment {
  id                      String   @id @default(cuid())

  invoiceId               String
  invoice                 Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  amount                  Float
  currency                String   @default("USD")

  paymentMethod           String?
  stripePaymentIntentId   String?
  stripeCheckoutSessionId String?

  status                  String
  // PENDING, SUCCEEDED, FAILED, REFUNDED

  payerEmail              String?
  payerName               String?

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  receiptGeneratedAt      DateTime?

  @@index([invoiceId])
  @@index([status])
  @@index([createdAt])
  @@index([stripePaymentIntentId])
  @@index([stripeCheckoutSessionId])
}

model PushToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  platform  String   @default("unknown")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
  
model InvoicePaymentRequestLog {
  id              String   @id @default(cuid())
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  channel         String   // "NETWORK", "EMAIL", "COPY_LINK"
  recipientEmail  String?
  recipientUserId String?
  conversationId  String?
  messageId       String?
  action          String   // "REQUEST_SENT", "REMINDER_SENT", "LINK_COPIED"
  status          String   @default("SENT") // "SENT", "FAILED", "BLOCKED"
  metadata        Json?
  createdAt       DateTime @default(now())

  @@index([invoiceId])
  @@index([recipientEmail])
  @@index([recipientUserId])
  @@index([channel])
  @@index([action])
  @@index([createdAt])
}

model InvoiceInstallment {
  id                      String   @id @default(cuid())

  invoiceId               String
  invoice                 Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  label                   String?
  amount                  Float
  dueDate                 DateTime?

  status                  String   @default("UNPAID")
  // UNPAID, PAYMENT_PENDING, PAID, OVERDUE, CANCELLED

  stripeCheckoutSessionId String?
  stripePaymentIntentId   String?

  paidAt                  DateTime?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@index([invoiceId])
  @@index([status])
  @@index([dueDate])
  @@index([stripeCheckoutSessionId])
  @@index([stripePaymentIntentId])
}

model InvoicePaymentAnalyticsEvent {
  id            String   @id @default(cuid())
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  eventType     String   // PORTAL_VIEW, PAYMENT_CTA_CLICK, INVOICE_VIEW, BUNDLE_VIEW
  channel       String?  // EMAIL, NETWORK, COPY_LINK, PUBLIC
  installmentId String?
  requestLogId  String?
  userAgent     String?
  ipHash        String?  // Hashed, never raw
  referrer      String?
  metadata      Json?
  createdAt     DateTime @default(now())

  @@index([invoiceId])
  @@index([eventType])
  @@index([channel])
  @@index([requestLogId])
  @@index([createdAt])
}

model CustomerContact {
  id            String   @id @default(cuid())
  ownerId       String
  owner         User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  name          String?
  firstName     String?
  lastName      String?
  email         String?
  phone         String?
  company       String?
  addressLine1  String?
  addressLine2  String?
  city          String?
  state         String?
  postalCode    String?
  country       String?

  source        String? // MANUAL, CSV, SQUARE, JOIST, INVOICE
  externalId    String?
  notes         String?

  invoices      Invoice[]
  notesArray    CustomerContactNote[]
  tags          CustomerContactTag[]
  communicationLogs CustomerCommunicationLog[]
  campaigns     CustomerEmailCampaignRecipient[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([ownerId])
  @@index([email])
  @@index([phone])
  @@index([source])
  @@index([createdAt])
}

model CustomerContactNote {
  id                String          @id @default(cuid())
  customerContactId String
  customerContact   CustomerContact @relation(fields: [customerContactId], references: [id], onDelete: Cascade)
  ownerId           String
  owner             User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  content           String          @db.Text
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([customerContactId])
  @@index([ownerId])
}

model CustomerTag {
  id        String               @id @default(cuid())
  ownerId   String
  owner     User                 @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name      String
  color     String?
  createdAt DateTime             @default(now())
  contacts  CustomerContactTag[]

  @@unique([ownerId, name])
}

model CustomerContactTag {
  customerContactId String
  tagId             String
  customerContact   CustomerContact @relation(fields: [customerContactId], references: [id], onDelete: Cascade)
  tag               CustomerTag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([customerContactId, tagId])
}

model CustomerCommunicationLog {
  id                String          @id @default(cuid())
  ownerId           String
  owner             User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  customerContactId String
  customerContact   CustomerContact @relation(fields: [customerContactId], references: [id], onDelete: Cascade)
  channel           String          // EMAIL, NETWORK, SMS_STUB
  direction         String          @default("OUTBOUND")
  subject           String?
  contentPreview    String?         @db.Text
  relatedInvoiceId  String?
  relatedCampaignId String?
  status            String?         // SENT, FAILED, BLOCKED
  createdAt         DateTime        @default(now())

  @@index([customerContactId])
  @@index([ownerId])
  @@index([channel])
  @@index([createdAt])
}

model CustomerEmailCampaign {
  id             String                           @id @default(cuid())
  ownerId        String
  owner          User                             @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name           String
  subject        String
  previewText    String?
  contentHtml    String?                          @db.Text
  contentText    String?                          @db.Text
  status         String                           @default("DRAFT") // DRAFT, SCHEDULED, SENDING, SENT, FAILED
  recipientCount Int                              @default(0)
  sentAt         DateTime?
  createdAt      DateTime                         @default(now())
  updatedAt      DateTime                         @updatedAt
  recipients     CustomerEmailCampaignRecipient[]

  @@index([ownerId])
  @@index([status])
  @@index([createdAt])
}

model CustomerEmailCampaignRecipient {
  id                String                @id @default(cuid())
  campaignId        String
  campaign          CustomerEmailCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  customerContactId String
  customerContact   CustomerContact       @relation(fields: [customerContactId], references: [id], onDelete: Cascade)
  email             String
  status            String                @default("PENDING") // PENDING, SENT, FAILED, OPENED, CLICKED
  openedAt          DateTime?
  clickedAt         DateTime?
  createdAt         DateTime              @default(now())

  @@index([campaignId])
  @@index([customerContactId])
  @@index([status])
}

model StripeWebhookEvent {
  id          String   @id
  type        String
  processedAt DateTime @default(now())
  status      String   @default("PROCESSED")
  metadata    Json?

  @@index([type])
  @@index([processedAt])
}

model InternalJobRun {
  id             String    @id @default(cuid())
  jobName        String
  status         String
  startedAt      DateTime  @default(now())
  finishedAt     DateTime?
  processedCount Int       @default(0)
  successCount   Int       @default(0)
  failedCount    Int       @default(0)
  skippedCount   Int       @default(0)
  errorMessage   String?   @db.Text
  metadata       Json?

  @@index([jobName])
  @@index([status])
  @@index([startedAt])
}

model VeroLensSession {
  id              String   @id @default(cuid())
  userId          String
  status          String   @default("DRAFT")
  title           String?
  serviceCategory String?
  tradeMode       String?
  tradeModeLabel  String?
  aiModel         String?
  aiProvider      String?
  analysisVersion String?
  aiSummary       String?
  aiRawJson       Json?
  confidenceScore Float?
  disclaimer         String?
  convertedInvoiceId String?
  activeVersionId    String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  images          VeroLensImage[]
  events          VeroLensEvent[]
  detections      VeroLensDetection[]
  lineItems       VeroLensLineItem[]
  questions       VeroLensQuestion[]
  shares          VeroLensShare[]
  approvals       VeroLensApproval[]
  revisions       VeroLensRevisionRequest[]
  versions        VeroLensVersion[]

  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}

model VeroLensPricingPreset {
  id                  String   @id @default(cuid())
  userId              String
  tradeMode           String
  label               String?
  defaultLaborRate    Decimal? @db.Decimal(10, 2)
  materialMarkupPct   Float?
  minimumJobFee       Decimal? @db.Decimal(10, 2)
  travelFee           Decimal? @db.Decimal(10, 2)
  defaultUnit         String?
  notes               String?
  isDefault           Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tradeMode])
  @@unique([userId, tradeMode])
}

model VeroLensCustomContext {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  category    String?
  icon        String?
  createdAt   DateTime @default(now())

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@unique([userId, name])
}

model VeroLensImage {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String
  imageUrl    String
  fileName    String?
  mimeType    String?
  sizeBytes   Int?
  annotations Json?
  createdAt   DateTime @default(now())

  session     VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([userId])
}

model VeroLensEvent {
  id        String   @id @default(cuid())
  sessionId String
  type      String
  message   String?
  createdAt DateTime @default(now())

  session   VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model VeroLensDetection {
  id          String   @id @default(cuid())
  sessionId   String
  name        String
  quantity    Float?
  condition   String?
  confidence  Float?
  notes       String?
  createdAt   DateTime @default(now())

  session     VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model VeroLensLineItem {
  id                 String   @id @default(cuid())
  sessionId          String
  title              String
  description        String?
  quantity           Float    @default(1)
  unit               String?
  unitPrice          Float?
  estimatedPriceLow  Float?
  estimatedPriceHigh Float?
  confidence         Float?
  source             String   @default("AI")
  sortOrder          Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  session            VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model VeroLensQuestion {
  id        String   @id @default(cuid())
  sessionId String
  question  String
  answer    String?
  required  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  session   VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model VeroLensShare {
  id              String   @id @default(cuid())
  sessionId       String
  token           String   @unique
  status          String   @default("ACTIVE")
  expiresAt       DateTime?
  allowApproval   Boolean  @default(true)
  allowSignature  Boolean  @default(true)
  createdAt       DateTime @default(now())
  viewedAt        DateTime?
  firstViewedAt   DateTime?
  lastViewedAt    DateTime?
  totalViews      Int      @default(0)
  approvedAt      DateTime?
  rejectedAt      DateTime?
  reminderCount   Int      @default(0)
  lastReminderSentAt DateTime?

  session         VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  approvals       VeroLensApproval[]

  @@index([token])
  @@index([sessionId])
}

model VeroLensApproval {
  id              String   @id @default(cuid())
  sessionId       String
  shareId         String?
  versionId       String?
  customerName    String?
  customerEmail   String?
  message         String?
  signatureDataUrl String? @db.Text
  status          String
  approvedAt      DateTime?
  rejectedAt      DateTime?
  createdAt       DateTime @default(now())

  session         VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  share           VeroLensShare? @relation(fields: [shareId], references: [id], onDelete: SetNull)
  version         VeroLensVersion? @relation(fields: [versionId], references: [id], onDelete: SetNull)

  @@index([sessionId])
  @@index([shareId])
}

model VeroLensRevisionRequest {
  id            String   @id @default(cuid())
  sessionId     String
  approvalId    String?
  customerName  String?
  customerEmail String?
  message       String   @db.Text
  resolved      Boolean  @default(false)
  createdAt     DateTime @default(now())
  resolvedAt    DateTime?

  session       VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model VeroLensVersion {
  id                String   @id @default(cuid())
  sessionId         String
  versionNumber     Int
  title             String?
  summary           String?
  changeSummary     String?
  status            String   @default("ACTIVE")

  createdAt         DateTime @default(now())
  createdByUserId   String?

  snapshotJson      Json

  session           VeroLensSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  approvals         VeroLensApproval[]

  @@index([sessionId])
  @@unique([sessionId, versionNumber])
}


```


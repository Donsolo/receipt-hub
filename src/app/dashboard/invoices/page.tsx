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

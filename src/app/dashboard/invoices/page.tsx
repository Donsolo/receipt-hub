import { cookies, headers } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import InvoiceActions from '@/components/invoices/InvoiceActions';
import HeroSection from '@/components/ui/HeroSection';

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
                <HeroSection pageKey="receipts" />
                
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
    let stats = { total: 0, sent: 0, viewed: 0, overdue: 0 };
    let fetchError: string | null = null;
    try {
        const allInvoices = await db.invoice.findMany({
            where: { userId: authUser.userId },
            include: { items: true }
        });

        const now = new Date();
        const processed = allInvoices.map(inv => {
            const times = [inv.createdAt, inv.sentAt, inv.lastViewedAt, inv.paymentConfirmedAt].filter(Boolean).map(t => new Date(t as Date).getTime());
            
            // Increment Stats
            stats.total++;
            if (inv.status === 'SENT') stats.sent++;
            if (inv.status === 'VIEWED') stats.viewed++;
            if (inv.status !== 'PAID' && inv.dueDate && inv.dueDate < now) stats.overdue++;

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

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
            <HeroSection pageKey="receipts" />
            
            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-6xl space-y-6 relative">
                
                <PageHeaderCard
                    title="Invoices"
                    description="Create, manage, and track your business billing."
                >
                    <Link href="/dashboard/invoices/create" className="inline-flex items-center justify-center px-4 py-2 mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all shadow-md shadow-blue-500/20 gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        New Invoice
                    </Link>
                </PageHeaderCard>

                {fetchError ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-start shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-red-500">Database Synchronization Error</h2>
                        </div>
                        <p className="text-[var(--text)] text-sm mb-4">
                            The server failed to securely retrieve your invoice data. This is typically caused by a pending Prisma schema migration on the deployment environment.
                        </p>
                        <div className="w-full bg-black/40 dark:bg-black/80 rounded-xl p-4 overflow-auto border border-red-500/20">
                            <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">{fetchError}</pre>
                        </div>
                    </div>
                ) : stats.total === 0 ? (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6 border border-blue-500/20">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Create your first invoice</h2>
                        <p className="text-[var(--muted)] text-sm max-w-sm mb-8">
                            Generate professional, audit-ready invoices and automatically convert them into trackable receipts when paid.
                        </p>
                        <Link href="/dashboard/invoices/create" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Get Started
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col">
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Total Invoices</span>
                                <span className="text-2xl font-black text-[var(--text)]">{stats.total}</span>
                            </div>
                            <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col">
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Sent</span>
                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.sent}</span>
                            </div>
                            <div className="bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col">
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Viewed</span>
                                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.viewed}</span>
                            </div>
                            <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col">
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Overdue</span>
                                <span className="text-2xl font-black text-red-600 dark:text-red-400">{stats.overdue}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Link href="/dashboard/invoices" className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all", filterParam === 'all' ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-md" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>All</Link>
                                <Link href="/dashboard/invoices?filter=draft" className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all", filterParam === 'draft' ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-md" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>Draft</Link>
                                <Link href="/dashboard/invoices?filter=sent" className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all", filterParam === 'sent' ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-md" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>Sent</Link>
                                <Link href="/dashboard/invoices?filter=viewed" className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all", filterParam === 'viewed' ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-md" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>Viewed</Link>
                                <Link href="/dashboard/invoices?filter=paid" className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all", filterParam === 'paid' ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-md" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>Paid</Link>
                                <Link href="/dashboard/invoices?filter=overdue" className={clsx("px-4 py-2 rounded-xl text-sm font-bold transition-all", filterParam === 'overdue' ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-md" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")}>Overdue</Link>
                            </div>
                            
                            {/* Sort Toggle */}
                            <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1">
                                <Link href={`/dashboard/invoices?filter=${filterParam}&sort=newest`} className={clsx("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", sortParam === 'newest' ? "bg-gray-100 dark:bg-white/10 text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]")}>Newest</Link>
                                <Link href={`/dashboard/invoices?filter=${filterParam}&sort=activity`} className={clsx("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors", sortParam === 'activity' ? "bg-gray-100 dark:bg-white/10 text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]")}>Last Activity</Link>
                            </div>
                        </div>
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-black/5 dark:bg-white/5">
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Title & Client</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Issue Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider text-right">Views</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-[var(--card-hover)] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col items-start">
                                                    {inv.status === 'PAID' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">PAID</span>}
                                                    {inv.status === 'DRAFT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--muted)]/10 text-[var(--muted)] border border-[var(--border)]">DRAFT</span>}
                                                    {inv.status === 'SENT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">SENT</span>}
                                                    {inv.status === 'VIEWED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">VIEWED</span>}
                                                    {inv.status === 'CANCELLED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">CANCELLED</span>}
                                                    
                                                    {/* Smart Status Hints */}
                                                    {inv.status === 'SENT' && inv.viewCount === 0 && inv.sentAt && (Date.now() - new Date(inv.sentAt).getTime() > 24 * 60 * 60 * 1000) && (
                                                        <div className="text-[10px] text-red-500/80 font-medium mt-1.5 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            Not yet viewed
                                                        </div>
                                                    )}
                                                    {inv.status === 'VIEWED' && (
                                                        <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-medium mt-1.5">
                                                            Client has viewed this invoice
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-[var(--text)]">{inv.title}</div>
                                                <div className="text-xs text-[var(--muted)] mt-0.5">
                                                    {inv.invoiceNumber && <span className="font-mono text-[var(--muted)]/80 mr-1.5">#{inv.invoiceNumber}</span>}
                                                    {inv.clientName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                                {formatDistanceToNow(new Date(inv.issueDate), { addSuffix: true })}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-[var(--text)]">{inv.viewCount || 0}</span>
                                                    {inv.lastViewedAt && (
                                                        <span className="text-[10px] text-[var(--muted)]">Last: {formatDistanceToNow(new Date(inv.lastViewedAt), { addSuffix: true })}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="font-bold text-[var(--text)] tabular-nums">${inv.total.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end">
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
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards (Hidden on Desktop) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {invoices.map((inv) => (
                            <div key={inv.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col gap-4 relative">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-[var(--text)] text-lg leading-tight">{inv.title}</div>
                                        <div className="text-sm text-[var(--muted)] mt-1 font-medium">
                                            {inv.invoiceNumber && <span className="font-mono text-[var(--muted)]/80 mr-1.5">#{inv.invoiceNumber}</span>}
                                            {inv.clientName}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="font-black text-blue-600 dark:text-blue-400 text-lg tabular-nums tracking-tight">${inv.total.toFixed(2)}</div>
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
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-end pt-4 border-t border-[var(--border)]">
                                    <div className="flex flex-col gap-2">
                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2">
                                            {inv.status === 'PAID' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">PAID</span>}
                                            {inv.status === 'DRAFT' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[var(--muted)]/10 text-[var(--muted)] border border-[var(--border)]">DRAFT</span>}
                                            {inv.status === 'SENT' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">SENT</span>}
                                            {inv.status === 'VIEWED' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">VIEWED</span>}
                                            {inv.status === 'CANCELLED' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">CANCELLED</span>}
                                            
                                            {inv.viewCount > 0 && (
                                                <span className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    {inv.viewCount} {inv.viewCount === 1 ? 'view' : 'views'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Smart Status Hints */}
                                        {inv.status === 'SENT' && inv.viewCount === 0 && inv.sentAt && (Date.now() - new Date(inv.sentAt).getTime() > 24 * 60 * 60 * 1000) && (
                                            <div className="text-[10px] text-red-500/80 font-medium flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Not yet viewed
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[11px] font-bold text-[var(--muted)] text-right">
                                        Issued<br/>{formatDistanceToNow(new Date(inv.issueDate), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

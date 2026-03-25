import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import InvoiceActions from '@/components/invoices/InvoiceActions';
import HeroSection from '@/components/ui/HeroSection';

export const dynamic = "force-dynamic";

export default async function InvoicesHub() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        return <div>Unauthorized</div>;
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";
    if (!isPro) {
        return (
            <div className="min-h-screen bg-[var(--bg)] p-8 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Pro Feature</h1>
                <p className="text-[var(--muted)] mb-6">Invoicing is restricted to Pro members.</p>
                <Link href="/upgrade" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
                    Upgrade to Pro
                </Link>
            </div>
        );
    }

    let invoices: any[] = [];
    let fetchError: string | null = null;
    try {
        invoices = await db.invoice.findMany({
            where: { userId: authUser.userId },
            orderBy: { createdAt: 'desc' },
            include: { items: true }
        });
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
                ) : invoices.length === 0 ? (
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
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-black/5 dark:bg-white/5">
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Title & Client</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Issue Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-[var(--card-hover)] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {inv.status === 'PAID' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">PAID</span>}
                                                {inv.status === 'DRAFT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--muted)]/10 text-[var(--muted)] border border-[var(--border)]">DRAFT</span>}
                                                {inv.status === 'SENT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">SENT</span>}
                                                {inv.status === 'CANCELLED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">CANCELLED</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-[var(--text)]">{inv.title}</div>
                                                <div className="text-xs text-[var(--muted)] mt-0.5">{inv.clientName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                                {format(new Date(inv.issueDate), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="font-bold text-[var(--text)] tabular-nums">${inv.total.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <InvoiceActions invoice={{ id: inv.id, status: inv.status, isConverted: inv.isConverted, publicToken: inv.publicToken }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

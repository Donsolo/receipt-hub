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

    const invoices = await db.invoice.findMany({
        where: { userId: authUser.userId },
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    });

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

                {invoices.length === 0 ? (
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
                                                <InvoiceActions invoice={{ id: inv.id, status: inv.status, isConverted: inv.isConverted }} />
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

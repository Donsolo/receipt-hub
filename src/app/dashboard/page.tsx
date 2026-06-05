"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import DashboardUpgradeButton from '@/components/ui/DashboardUpgradeButton';
import BillingDashboardWidget from '@/components/billing/BillingDashboardWidget';
import DashboardHero from '@/components/dashboard/DashboardHero';

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const headers = await getAuthHeader();
                const res = await fetch(`${API_BASE_URL}/api/dashboard`, {
                    headers: { ...headers as any, 'Content-Type': 'application/json' }
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }

                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setData(json);
                    }
                }
            } catch (err) {
                console.error("Dashboard fetch error", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center pb-24">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (!data) {
        return <div className="p-8 text-center text-gray-500">Failed to load dashboard data.</div>;
    }

    const { user, isPro, receipts, userInvoices, lensStats } = data;

    // --- Smart Greeting Logic ---
    const tzTimeStr = new Date().toLocaleString("en-US", { timeZone: user?.timezone || 'America/New_York', hour: 'numeric', hour12: false });
    let currentHour = parseInt(tzTimeStr, 10);
    if (currentHour === 24) currentHour = 0;

    let timeGreeting = "Good evening";
    if (currentHour >= 5 && currentHour < 12) {
        timeGreeting = "Good morning";
    } else if (currentHour >= 12 && currentHour < 17) {
        timeGreeting = "Good afternoon";
    }

    let displayName = "";
    if (user?.businessName) {
        displayName = user.businessName;
    } else if (user?.name) {
        displayName = user.name;
    }

    // --- Stats Logic ---
    const totalReceipts = receipts.length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthReceipts = receipts.filter((r: any) => new Date(r.createdAt) >= startOfMonth).length;

    let lastActivityStr = "No activity yet";
    let relativeTimeStr = "";
    if (totalReceipts > 0 && receipts[0].createdAt) {
        const lastDate = new Date(receipts[0].createdAt);
        lastActivityStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const diffInDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffInDays === 0) relativeTimeStr = "Today";
        else if (diffInDays === 1) relativeTimeStr = "Yesterday";
        else relativeTimeStr = `${diffInDays} days ago`;
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col pb-24">
            <DashboardHero
                title={displayName ? `${timeGreeting}, ${displayName}.` : `${timeGreeting}.`}
                subtitle="Here’s your receipt workspace command center."
                totalReceipts={totalReceipts}
                thisMonthReceipts={thisMonthReceipts}
                lastActivityStr={lastActivityStr}
                relativeTimeStr={relativeTimeStr}
            >
                {user?.isEarlyAccess && !isPro && (
                    <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm">
                        Core (Early Access Founder)
                    </span>
                )}
                {isPro && (
                    <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-sm">
                        PRO
                    </span>
                )}
                {!isPro && (
                    <DashboardUpgradeButton />
                )}
            </DashboardHero>

            {/* BODY SURFACE */}
            <div className="relative z-20 flex-1 bg-[var(--bg)] rounded-t-[20px] -mt-4 px-4 sm:px-6 pt-6 pb-12 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                <div className="max-w-5xl mx-auto w-full space-y-6">

                    <BillingDashboardWidget />

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <Link href="/history" className="block group h-full">
                            <div className="bg-[var(--card)] rounded-[16px] border border-[var(--border)] px-5 py-6 hover:border-[#5B5FEF]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                                <div className="flex items-start gap-4 mb-2 relative z-10">
                                    <div className="h-12 w-12 shrink-0 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors shadow-inner border border-blue-500/10">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <h2 className="text-[16px] font-semibold text-[var(--text)] transition-colors tracking-tight">Receipt Hub</h2>
                                        <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Create, upload, manage, and share all of your business receipts in the vault.</p>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {isPro && (
                            <Link href="/dashboard/invoices" className="block group h-full">
                                <div className="bg-[var(--card)] rounded-[16px] border border-[var(--border)] px-5 py-6 hover:border-[#5B5FEF]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                                    <div className="flex items-start gap-4 mb-2 relative z-10">
                                        <div className="h-12 w-12 shrink-0 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500/20 transition-colors shadow-inner border border-indigo-500/10">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 pt-1.5">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-[16px] font-semibold text-[var(--text)] transition-colors tracking-tight">Invoices</h2>
                                                {userInvoices && userInvoices.length > 0 && (
                                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{userInvoices.length}</span>
                                                )}
                                            </div>
                                            <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Create and manage professional invoices.</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}
                        
                        <Link href="/dashboard/reports" className="block group h-full">
                            <div className="bg-[var(--card)] rounded-[16px] border border-[var(--border)] px-5 py-6 hover:border-[#5B5FEF]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                                <div className="flex items-start gap-4 mb-2 relative z-10">
                                    <div className="h-12 w-12 shrink-0 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/20 transition-colors shadow-inner border border-emerald-500/10">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <h2 className="text-[16px] font-semibold text-[var(--text)] transition-colors tracking-tight">Reports</h2>
                                        <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Export your data into beautiful expense reports.</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        
                        {isPro && (
                            <Link href="/dashboard/vero" className="block group h-full">
                                <div className="bg-[var(--card)] rounded-[16px] border border-[var(--border)] px-5 py-6 hover:border-[#5B5FEF]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                                    <div className="flex items-start gap-4 mb-2 relative z-10">
                                        <div className="h-12 w-12 shrink-0 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 group-hover:bg-purple-500/20 transition-colors shadow-inner border border-purple-500/10">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 pt-1.5">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-[16px] font-semibold text-[var(--text)] transition-colors tracking-tight">Vero Lens</h2>
                                                {(lensStats.approved > 0 || lensStats.pending > 0) && (
                                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{lensStats.approved + lensStats.pending}</span>
                                                )}
                                            </div>
                                            <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Secure viewing access portals for clients.</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

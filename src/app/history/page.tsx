import { getReceipts } from "@/lib/actions";
import Link from 'next/link';
import HistoryClient from '@/components/HistoryClient';
import BundlesClient from '@/components/BundlesClient';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import HeroSection from '@/components/ui/HeroSection';

export const dynamic = "force-dynamic";

export default async function HistoryPage(props: {
    searchParams: Promise<{ query?: string, view?: string }>;
}) {
    const searchParams = await props.searchParams;
    const searchQuery = searchParams?.query || "";
    const activeView = searchParams?.view === 'bundles' ? 'bundles' : 'receipts';

    const receipts = activeView === 'receipts' ? await getReceipts(searchQuery) : [];

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
            <HeroSection pageKey="receipts" />

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-6xl space-y-6 relative">
                    <PageHeaderCard title="Receipts" description="Manage, organize, and share your financial records.">
                        <div className="mt-4 flex space-x-3">
                            <Link
                                href="/uploads"
                                className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-semibold text-black bg-white dark:bg-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
                            >
                                Upload Receipt
                            </Link>
                            <Link
                                href="/create"
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.2)] text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)] transition-all duration-200"
                            >
                                Create Receipt
                            </Link>
                        </div>
                    </PageHeaderCard>

                    {/* Segmented Control Tabs */}
                    <div className="border-b border-[var(--border)]">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <Link
                                href="/history"
                                className={`whitespace-nowrap pb-4 px-1 border-b-[3px] font-medium text-sm transition-all duration-300 ${activeView === 'receipts'
                                    ? 'border-indigo-500 text-[var(--text)]'
                                    : 'border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-gray-600'
                                    }`}
                                aria-current={activeView === 'receipts' ? 'page' : undefined}
                            >
                                All Receipts
                            </Link>
                            <Link
                                href="/history?view=bundles"
                                className={`whitespace-nowrap pb-4 px-1 border-b-[3px] font-medium text-sm transition-all duration-300 ${activeView === 'bundles'
                                    ? 'border-indigo-500 text-[var(--text)]'
                                    : 'border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-gray-600'
                                    }`}
                                aria-current={activeView === 'bundles' ? 'page' : undefined}
                            >
                                Bundles
                            </Link>
                        </nav>
                    </div>

                    <div key={activeView} className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
                        {activeView === 'receipts' && (
                            <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
                                <HistoryClient initialReceipts={receipts} />
                            </div>
                        )}

                        {activeView === 'bundles' && (
                            <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden rounded-t-none border-t-0 p-2 sm:p-4 min-h-[500px]">
                                <BundlesClient />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

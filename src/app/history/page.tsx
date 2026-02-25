import { getReceipts } from "@/lib/actions";
import Link from 'next/link';
import HistoryClient from '@/components/HistoryClient';
import BundlesClient from '@/components/BundlesClient';

export const dynamic = "force-dynamic";

export default async function HistoryPage(props: {
    searchParams: Promise<{ query?: string, view?: string }>;
}) {
    const searchParams = await props.searchParams;
    const searchQuery = searchParams?.query || "";
    const activeView = searchParams?.view === 'bundles' ? 'bundles' : 'receipts';

    const receipts = activeView === 'receipts' ? await getReceipts(searchQuery) : [];

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-[var(--text-primary)] sm:text-3xl sm:truncate">
                        Receipts
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        Manage, organize, and share your financial records.
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                    <Link
                        href="/uploads"
                        className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-[var(--text)] bg-transparent hover:bg-[var(--card-hover)] hover:text-[var(--text)] transition-all duration-200"
                    >
                        Upload Receipt
                    </Link>
                    <Link
                        href="/create"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.2)] text-sm font-medium text-[var(--text)] bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)] transition-all duration-200"
                    >
                        Create Receipt
                    </Link>
                </div>
            </div>

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
    );
}

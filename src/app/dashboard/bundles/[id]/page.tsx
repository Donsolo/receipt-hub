"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

type Category = { name: string; color: string | null };

type Receipt = {
    id: string;
    receiptNumber?: string | null;
    clientName?: string | null;
    total?: number;
    date?: Date | string;
    imageUrl?: string | null;
    createdAt: Date | string;
    category?: Category | null;
};

type BundleReceipt = {
    receiptId: string;
    addedAt: string;
    receipt: Readonly<Receipt>;
};

type Bundle = {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    receipts: BundleReceipt[];
};

export default function BundleDetailPage() {
    const params = useParams() as { id: string };
    const router = useRouter();
    const [bundle, setBundle] = useState<Bundle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!params?.id) return;
        fetchBundle();
    }, [params?.id]);

    const fetchBundle = async () => {
        try {
            const res = await fetch(`/api/bundles/${params.id}`);
            if (!res.ok) throw new Error('Failed to fetch bundle details');
            const data = await res.json();
            setBundle(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveReceipt = async (receiptId: string) => {
        if (!confirm('Remove this receipt from the bundle?')) return;

        try {
            const res = await fetch(`/api/bundles/${params.id}/remove-receipt?receiptId=${receiptId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to remove receipt');

            // Optimistic UI update
            setBundle(prev => prev ? {
                ...prev,
                receipts: prev.receipts.filter(r => r.receiptId !== receiptId)
            } : null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading bundle details...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!bundle) return <div className="p-8 text-center text-gray-500">Bundle not found.</div>;

    const totalAmount = bundle.receipts.reduce((sum, item) => sum + (item.receipt.total || 0), 0);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="mb-8">
                <Link href="/history?view=bundles" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 mb-6 transition-colors">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Bundles
                </Link>

                <div className="flex items-start justify-between bg-[#111827] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">{bundle.name}</h1>
                        {bundle.description && (
                            <p className="mt-3 text-gray-400 text-base leading-relaxed max-w-2xl">{bundle.description}</p>
                        )}
                        <div className="mt-6 flex flex-wrap gap-4 items-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm text-gray-300">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                                {bundle.receipts.length} Receipt{bundle.receipts.length !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm text-emerald-400 font-medium tracking-wide">
                                Total: ${totalAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipts List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4 px-1">Bundle Contents</h3>

                {bundle.receipts.length === 0 ? (
                    <div className="text-center py-16 bg-[#0B1220] border border-white/5 rounded-2xl">
                        <p className="text-gray-500">No receipts have been added to this bundle yet.</p>
                        <p className="text-sm text-gray-600 mt-2">Go to your Receipts history and click 'Add to Bundle' on any receipt.</p>
                    </div>
                ) : (
                    bundle.receipts.map(({ receiptId, addedAt, receipt }) => {
                        const dateVal = receipt.date || receipt.createdAt;
                        const categoryName = receipt.category?.name || 'Uncategorized';

                        return (
                            <div key={receiptId} className="relative flex items-center justify-between transition-all duration-200 bg-[#0f172a] border border-white/5 rounded-2xl px-5 py-4 shadow-sm hover:-translate-y-1 hover:shadow-xl group">

                                {/* Status Accent */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: receipt.receiptNumber ? '#6366f1' : '#10b981' }} />

                                <div className="flex items-center flex-1 min-w-0 pl-2">
                                    <div className="flex-col hidden sm:flex space-y-1 w-32 border-r border-gray-800/50 pr-4 mr-4">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</p>
                                        <p className="text-sm font-semibold text-gray-300">{format(new Date(addedAt), 'MMM d, yyyy')}</p>
                                    </div>

                                    <div className="hidden sm:flex flex-shrink-0 h-12 w-12 rounded-lg bg-black/50 items-center justify-center overflow-hidden border border-white/5 mr-5 group-hover:border-indigo-500/30 transition-colors">
                                        {receipt.imageUrl ? (
                                            <img src={receipt.imageUrl} alt="Receipt" className="h-full w-full object-cover" />
                                        ) : (
                                            <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        )}
                                    </div>

                                    <div className="truncate flex-1">
                                        <p className="text-gray-100 font-semibold text-base truncate">
                                            {receipt.receiptNumber || 'Uploaded Receipt ID'}
                                            <span className="ml-2 text-sm text-gray-400 font-medium">- {receipt.clientName || 'Unnamed Client'}</span>
                                        </p>
                                        <p className="text-gray-400 text-sm mt-1 truncate">
                                            {format(new Date(dateVal), 'MMM d, yyyy')} {categoryName !== 'Uncategorized' && <span className="text-gray-500 mx-1">•</span>} {categoryName !== 'Uncategorized' && <span className="text-indigo-400/80">{categoryName}</span>}
                                        </p>
                                    </div>
                                </div>

                                <div className="ml-6 flex-shrink-0 flex items-center gap-4">
                                    {receipt.total !== undefined && receipt.total !== null && (
                                        <span className="hidden sm:block text-lg font-bold text-gray-200 min-w-20 text-right">
                                            ${Number(receipt.total).toFixed(2)}
                                        </span>
                                    )}

                                    <Link
                                        href={receipt.receiptNumber ? `/receipt/${receipt.id}` : receipt.imageUrl || '#'}
                                        target={receipt.receiptNumber ? undefined : '_blank'}
                                        className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg text-white bg-[#1F2937] hover:bg-[#374151] border border-gray-700 transition-colors"
                                    >
                                        View
                                    </Link>
                                    <button
                                        onClick={() => handleRemoveReceipt(receiptId)}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20"
                                        title="Remove from bundle"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type Receipt = {
    id: string;
    receiptNumber?: string | null;
    clientName?: string | null;
    total?: number;
    date?: Date;
    imageUrl?: string | null;
    createdAt: Date;
};

export default function HistoryClient({ initialReceipts }: { initialReceipts: Receipt[] }) {
    const [filter, setFilter] = useState<'all' | 'generated' | 'uploaded'>('all');
    const router = useRouter();

    const filteredReceipts = initialReceipts.filter(receipt => {
        if (filter === 'generated') return !!receipt.receiptNumber;
        if (filter === 'uploaded') return !!receipt.imageUrl && !receipt.receiptNumber;
        return true;
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this receipt?')) return;

        try {
            const res = await fetch(`/api/receipts/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                router.refresh();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-[var(--border-subtle)]">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {['all', 'generated', 'uploaded'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab as any)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                                ${filter === tab
                                    ? 'border-indigo-500 text-indigo-500'
                                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'}
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* List */}
            <div className="bg-[var(--bg-card)] shadow overflow-hidden sm:rounded-md border border-[var(--border-subtle)]">
                <ul className="divide-y divide-[var(--border-subtle)]">
                    {filteredReceipts.length === 0 ? (
                        <li className="px-6 py-12 text-center text-[var(--text-secondary)]">No receipts found.</li>
                    ) : (
                        filteredReceipts.map((receipt) => (
                            <li key={receipt.id}>
                                <div className="block hover:bg-[var(--bg-surface)] transition duration-150 ease-in-out">
                                    <div className="px-4 py-4 sm:px-6 flex items-center justify-between">

                                        {/* Main Content Area */}
                                        <div className="flex items-center flex-1 min-w-0">

                                            {/* Icon / Thumbnail */}
                                            <div className="flex-shrink-0 h-12 w-12 rounded bg-[var(--bg-surface)] flex items-center justify-center overflow-hidden border border-[var(--border-subtle)]">
                                                {receipt.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={receipt.imageUrl} alt="Receipt" className="h-full w-full object-cover" />
                                                ) : (
                                                    <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="ml-4 truncate">
                                                <div className="flex items-center text-sm">
                                                    <p className="font-medium text-indigo-400 truncate mr-2">
                                                        {receipt.receiptNumber || 'Uploaded Receipt'}
                                                    </p>
                                                    {receipt.receiptNumber ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-900">
                                                            Generated
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-900/50 text-teal-200 border border-teal-900">
                                                            Uploaded
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 flex-shrink-0 font-normal text-[var(--text-secondary)] text-sm">
                                                    {receipt.clientName ? `${receipt.clientName}` : ''}
                                                </p>
                                                <div className="mt-2 flex">
                                                    <div className="flex items-center text-sm text-[var(--text-secondary)]">
                                                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                        </svg>
                                                        <p>
                                                            {format(new Date(receipt.date || receipt.createdAt), 'MMM d, yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="ml-5 flex-shrink-0 flex space-x-2 items-center">
                                            {receipt.total !== undefined && receipt.total !== null && (
                                                <span className="hidden sm:inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-green-900/50 text-green-200 border border-green-900 mr-2">
                                                    ${Number(receipt.total).toFixed(2)}
                                                </span>
                                            )}

                                            <Link
                                                href={receipt.receiptNumber ? `/receipt/${receipt.id}` : receipt.imageUrl || '#'}
                                                target={receipt.receiptNumber ? undefined : '_blank'}
                                                className="px-3 py-1 border border-[var(--border-subtle)] shadow-sm text-sm font-medium rounded-md text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-gray-800"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(receipt.id)}
                                                className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-400 bg-red-900/20 hover:bg-red-900/40"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

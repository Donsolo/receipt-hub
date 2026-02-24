"use client";

import { useState, useEffect } from 'react';
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
    category?: { name: string; color: string | null } | null;
    isFinalized?: boolean;
};

export default function HistoryClient({ initialReceipts }: { initialReceipts: Receipt[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'uploaded'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

    const router = useRouter();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 250);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => ({
            ...prev,
            [category]: prev[category] === false ? true : false
        }));
    };

    const isOpen = (category: string) => openCategories[category] !== false; // default true

    let filteredReceipts = initialReceipts.filter(receipt => {
        if (statusFilter === 'generated' && !receipt.receiptNumber) return false;
        if (statusFilter === 'uploaded' && (receipt.receiptNumber || !receipt.imageUrl)) return false;

        if (debouncedQuery) {
            const query = debouncedQuery.toLowerCase();
            const categoryName = (receipt.category?.name || 'Uncategorized').toLowerCase();
            const clientName = (receipt.clientName || '').toLowerCase();
            const receiptNumber = (receipt.receiptNumber || '').toLowerCase();

            if (!categoryName.includes(query) && !clientName.includes(query) && !receiptNumber.includes(query)) {
                return false;
            }
        }
        return true;
    });

    filteredReceipts = filteredReceipts.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
        if (sortBy === 'az') return (a.clientName || 'Unnamed').localeCompare(b.clientName || 'Unnamed');
        return 0;
    });

    const groupedReceipts = filteredReceipts.reduce((acc, receipt) => {
        const categoryName = receipt.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
            acc[categoryName] = {
                color: receipt.category?.color || null,
                receipts: []
            };
        }
        acc[categoryName].receipts.push(receipt);
        return acc;
    }, {} as Record<string, { color: string | null, receipts: Receipt[] }>);

    const sortedCategoryNames = Object.keys(groupedReceipts).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const toggleAll = () => {
        const allOpen = sortedCategoryNames.every(name => isOpen(name));
        const nextState: Record<string, boolean> = {};
        sortedCategoryNames.forEach(name => {
            nextState[name] = !allOpen;
        });
        setOpenCategories(nextState);
    };

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
        <div
            className="min-h-screen px-4 pb-12 sm:px-6 lg:px-8 transition-opacity duration-500 ease-out"
            style={{
                background: `radial-gradient(circle at 20% top, rgba(99,102,241,0.08), transparent 40%), radial-gradient(circle at 80% bottom, rgba(16,185,129,0.05), transparent 50%), #020617`,
                animation: 'fadeIn 0.5s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className="max-w-7xl mx-auto space-y-6 pt-6 flex flex-col min-h-[50vh]">

                {/* Search + Filter + Sort Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-2 z-10 relative">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search receipts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-white/10 rounded-[10px] text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm h-[40px]"
                        />
                    </div>

                    <div className="flex gap-4 sm:w-auto">
                        {/* Status Filter Dropdown */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full sm:w-40 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-[10px] text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm h-[40px] appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="generated">Generated</option>
                            <option value="uploaded">Uploaded</option>
                        </select>

                        {/* Sort Dropdown */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full sm:w-40 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-[10px] text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm h-[40px] appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="az">A → Z</option>
                        </select>
                    </div>
                </div>

                {/* Expand / Collapse All Toggle */}
                {filteredReceipts.length > 0 && (
                    <div className="flex justify-end pt-2 pb-1">
                        <button
                            onClick={toggleAll}
                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 tracking-wide transition-colors active:scale-95 ease-out duration-150"
                        >
                            {sortedCategoryNames.every(name => isOpen(name)) ? 'Collapse All' : 'Expand All'}
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="space-y-6 flex-1">
                    {initialReceipts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 mt-10">
                            <div className="w-16 h-16 mb-6 rounded-2xl bg-[#0f172a] border border-white/5 flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-200 mb-2 tracking-tight">No receipts yet.</h2>
                            <p className="text-gray-400 font-medium tracking-wide text-sm">Create your first receipt to get started.</p>
                        </div>
                    ) : filteredReceipts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 mt-10 text-center">
                            <svg className="w-12 h-12 text-gray-400 mb-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-200 mb-2 tracking-tight">No matching receipts.</h2>
                            <p className="text-gray-400 font-medium tracking-wide text-sm">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        sortedCategoryNames.map(categoryName => {
                            const { color, receipts } = groupedReceipts[categoryName];
                            const expanded = isOpen(categoryName);

                            return (
                                <div key={categoryName} className="flex flex-col">
                                    {/* Category Header */}
                                    <div
                                        onClick={() => toggleCategory(categoryName)}
                                        className="flex items-center justify-between cursor-pointer border border-white/5 hover:bg-white/[0.05] transition-all duration-200 mb-4 shadow-sm"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            backdropFilter: 'blur(6px)',
                                            WebkitBackdropFilter: 'blur(6px)',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                        }}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shadow-sm"
                                                style={{ backgroundColor: color || '#6b7280' }}
                                            />
                                            <h3 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
                                                {categoryName}
                                            </h3>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span
                                                className="inline-flex items-center px-[10px] py-[3px] rounded-full text-gray-300 font-semibold uppercase tracking-[0.5px]"
                                                style={{
                                                    background: '#0f172a',
                                                    fontSize: '11px',
                                                }}
                                            >
                                                {receipts.length}
                                            </span>
                                            <svg
                                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ease-in-out ${expanded ? 'rotate-180' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Animated Container */}
                                    <div
                                        className="transition-all duration-250 ease-in-out overflow-hidden"
                                        style={{
                                            maxHeight: expanded ? '3500px' : '0',
                                            opacity: expanded ? 1 : 0,
                                        }}
                                    >
                                        <ul className="space-y-4 pb-4">
                                            {receipts.length === 0 ? (
                                                <li className="py-8 text-center bg-[#0f172a] rounded-[14px] border border-white/5 shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                                                    <p className="text-gray-400 font-medium">No receipts in this category yet.</p>
                                                </li>
                                            ) : (
                                                receipts.map((receipt, index) => (
                                                    <li
                                                        key={receipt.id}
                                                        className="block relative group"
                                                        style={{
                                                            animationName: expanded ? 'fadeInUp' : 'none',
                                                            animationDuration: '0.4s',
                                                            animationTimingFunction: 'ease-out',
                                                            animationFillMode: 'forwards',
                                                            animationDelay: `${index * 40}ms`,
                                                            opacity: expanded ? 0 : 1 // Prevents pop-in before animation
                                                        }}
                                                    >
                                                        <div className="relative flex items-center justify-between transition-all duration-200 ease-in-out bg-[#0f172a] border border-white/5 rounded-[14px] px-[16px] py-[16px] xl:py-[18px] shadow-[0_6px_20px_rgba(0,0,0,0.35)] group-hover:-translate-y-[3px] group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]">

                                                            {/* LEFT STATUS ACCENT BAR */}
                                                            <div
                                                                className="absolute left-0 top-0 bottom-0 w-[3px]"
                                                                style={{
                                                                    borderTopRightRadius: '6px',
                                                                    borderBottomRightRadius: '6px',
                                                                    background: receipt.receiptNumber ? '#6366f1' : '#10b981'
                                                                }}
                                                            />

                                                            {/* Main Content Area */}
                                                            <div className="flex items-center flex-1 min-w-0 pl-3">

                                                                {/* Optional Icon / Thumbnail (Kept for continuity) */}
                                                                <div className="hidden sm:flex flex-shrink-0 h-11 w-11 rounded-lg bg-black/50 items-center justify-center overflow-hidden border border-white/5 mr-4 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                    {receipt.imageUrl ? (
                                                                        // eslint-disable-next-line @next/next/no-img-element
                                                                        <img src={receipt.imageUrl} alt="Receipt" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    )}
                                                                </div>

                                                                {/* Details: Hierarchy requested */}
                                                                <div className="truncate flex-1">
                                                                    <div className="flex flex-col space-y-[4px]">
                                                                        {/* Line 1: Receipt ID */}
                                                                        <p className="text-gray-100 truncate" style={{ fontWeight: 600, fontSize: '15px' }}>
                                                                            {receipt.receiptNumber || 'Uploaded Receipt ID'}
                                                                        </p>

                                                                        {/* Line 2: Client Name */}
                                                                        <p className="text-gray-200 truncate" style={{ fontWeight: 500, opacity: 0.8, fontSize: '14px' }}>
                                                                            {receipt.clientName || 'Unnamed Client'}
                                                                        </p>

                                                                        {/* Line 3: Date · Category */}
                                                                        <p className="text-gray-300 truncate" style={{ fontSize: '13px', opacity: 0.6 }}>
                                                                            {format(new Date(receipt.date || receipt.createdAt), 'MMM d, yyyy')}
                                                                            {categoryName !== 'Uncategorized' && ` · ${categoryName}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Actions & Total */}
                                                            <div className="ml-5 flex-shrink-0 flex items-center space-x-3">
                                                                {receipt.total !== undefined && receipt.total !== null && (
                                                                    <span className="hidden sm:inline-flex text-lg font-bold text-gray-200 tracking-tight mr-3">
                                                                        ${Number(receipt.total).toFixed(2)}
                                                                    </span>
                                                                )}

                                                                <Link
                                                                    href={receipt.receiptNumber ? `/receipt/${receipt.id}` : receipt.imageUrl || '#'}
                                                                    target={receipt.receiptNumber ? undefined : '_blank'}
                                                                    className="px-[14px] py-[8px] text-sm font-medium rounded-lg text-white transition-all duration-[120ms] ease-out active:scale-[0.97]"
                                                                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#1f2937'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#111827'}
                                                                >
                                                                    View
                                                                </Link>
                                                                {!receipt.isFinalized && (
                                                                    <button
                                                                        onClick={() => handleDelete(receipt.id)}
                                                                        className="px-[14px] py-[8px] text-sm font-medium rounded-lg transition-all duration-[120ms] ease-out active:scale-[0.97]"
                                                                        style={{ background: 'rgba(220,38,38,0.15)', color: '#ef4444' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,0.25)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220,38,38,0.15)'}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </div>

                                                        </div>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

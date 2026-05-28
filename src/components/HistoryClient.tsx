"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, isThisMonth } from 'date-fns';
import { 
    IconUpload, IconPlus, IconSearch, IconAdjustmentsHorizontal,
    IconFileInvoice, IconFolder, IconUsers, IconReceipt, IconCheck, IconClock, IconFileSymlink
} from '@tabler/icons-react';
import { clsx } from 'clsx';
import BundlesClient from './BundlesClient';

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
    bundles?: Array<{ bundle: { id: string; name: string } }>;
};

type FilterType = 'All' | 'Verified' | 'Pending' | 'Draft' | 'This month' | 'Newest';

export default function HistoryClient({ initialReceipts }: { initialReceipts: Receipt[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('view') || 'receipts';

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');

    // Filter Logic
    const filteredReceipts = useMemo(() => {
        let result = initialReceipts;

        // Apply Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r => 
                (r.clientName?.toLowerCase() || '').includes(query) ||
                (r.receiptNumber?.toLowerCase() || '').includes(query) ||
                (r.category?.name?.toLowerCase() || '').includes(query)
            );
        }

        // Apply Filter Chip
        if (activeFilter === 'Verified') {
            result = result.filter(r => r.isFinalized === true);
        } else if (activeFilter === 'Pending') {
            result = result.filter(r => !!r.receiptNumber && !r.isFinalized);
        } else if (activeFilter === 'Draft') {
            result = result.filter(r => !r.receiptNumber && !r.isFinalized);
        } else if (activeFilter === 'This month') {
            result = result.filter(r => isThisMonth(new Date(r.date || r.createdAt)));
        } else if (activeFilter === 'Newest') {
            // Sorting handles newest
        }

        // Sort Newest
        result.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

        return result;
    }, [initialReceipts, searchQuery, activeFilter]);

    // Stats calculation from filtered results
    const totalSpend = filteredReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const receiptCount = filteredReceipts.length;
    const categoryCount = new Set(filteredReceipts.map(r => r.category?.name || 'Uncategorized')).size;

    // Grouping for display
    const groupedReceipts = useMemo(() => {
        const groups: Record<string, { color: string | null, receipts: Receipt[] }> = {};
        filteredReceipts.forEach(receipt => {
            const cat = receipt.category?.name || 'Uncategorized';
            if (!groups[cat]) {
                groups[cat] = { color: receipt.category?.color || '#9CA3AF', receipts: [] };
            }
            groups[cat].receipts.push(receipt);
        });
        return groups;
    }, [filteredReceipts]);

    const sortedCategoryNames = Object.keys(groupedReceipts).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const getStatusStyle = (receipt: Receipt) => {
        if (receipt.isFinalized === true) return { label: 'Verified', bg: '#E1F5EE', text: '#0F6E56', icon: <IconCheck size={12} /> };
        if (receipt.receiptNumber && !receipt.isFinalized) return { label: 'Pending', bg: '#FAEEDA', text: '#854F0B', icon: <IconClock size={12} /> };
        return { label: 'Draft', bg: '#F1EFE8', text: '#5F5E5A', icon: <IconFileSymlink size={12} /> };
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* HERO SECTION */}
            <div className="relative pt-12 pb-24 px-5 bg-[#0B0F1A] text-white overflow-hidden">
                {/* Ambient Glows */}
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'rgba(99,102,241,0.28)' }}></div>
                <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'rgba(139,92,246,0.18)' }}></div>
                
                {/* Line Grid Overlay */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.12) 1px, transparent 1px)
                        `,
                        backgroundSize: '32px 32px',
                        animation: 'grid-drift 8s linear infinite'
                    }}
                ></div>
                
                <div className="relative z-10">
                    {/* Header Row */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-[28px] font-bold tracking-tight">Receipts</h1>
                            <p className="text-sm text-gray-400 mt-0.5">Manage and organize your spending</p>
                        </div>
                        <div className="flex space-x-2">
                            <Link href="/uploads" className="w-[40px] h-[40px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-md">
                                <IconUpload size={20} stroke={1.5} />
                            </Link>
                            <Link href="/create" className="w-[40px] h-[40px] flex items-center justify-center rounded-full bg-[#5B5FEF] hover:bg-[#4F54E5] transition shadow-[0_4px_12px_rgba(91,95,239,0.4)]">
                                <IconPlus size={20} stroke={2} />
                            </Link>
                        </div>
                    </div>

                    {/* Stats Pills */}
                    <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                        <div className="flex-shrink-0 flex items-center space-x-2 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                            <div className="w-6 h-6 rounded-full bg-[#5B5FEF]/20 flex items-center justify-center text-[#5B5FEF]">
                                <IconReceipt size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Spend</span>
                                <span className="text-sm font-bold font-mono">${totalSpend.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-2 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                            <div className="w-6 h-6 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                                <IconFileInvoice size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Receipts</span>
                                <span className="text-sm font-bold font-mono">{receiptCount}</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-2 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                            <div className="w-6 h-6 rounded-full bg-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
                                <IconFolder size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Categories</span>
                                <span className="text-sm font-bold font-mono">{categoryCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BODY SURFACE (Card Lift) */}
            <div className="relative z-20 flex-1 bg-[#F4F5F9] rounded-t-[20px] -mt-5 px-4 pt-5 pb-8 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                
                {/* Segmented Control */}
                <div className="flex p-1 bg-gray-200/60 rounded-full mb-5">
                    {[
                        { id: 'receipts', label: 'All Receipts', icon: <IconReceipt size={16} className="mr-1.5" /> },
                        { id: 'bundles', label: 'Bundles', icon: <IconFolder size={16} className="mr-1.5" /> },
                        { id: 'shared', label: 'Shared', icon: <IconUsers size={16} className="mr-1.5" /> }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => router.push(`?view=${tab.id}`)}
                                className={clsx(
                                    "flex-1 flex justify-center items-center py-2 text-sm font-semibold rounded-full transition-all duration-200",
                                    isActive ? "bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area Based on Tab */}
                {activeTab === 'bundles' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <BundlesClient />
                    </div>
                ) : activeTab === 'shared' ? (
                    <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <IconUsers size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Shared Receipts</h3>
                        <p className="text-gray-500 text-sm mt-1">Receipts shared with you will appear here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Search Bar */}
                        <div className="relative flex items-center mb-4">
                            <div className="absolute left-3.5 text-gray-400">
                                <IconSearch size={18} />
                            </div>
                            <input 
                                type="text"
                                placeholder="Search vendor, category, or amount..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 bg-white border-0 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none"
                            />
                            <div className="absolute right-3 w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl cursor-pointer hover:bg-gray-100 transition border border-gray-100">
                                <IconAdjustmentsHorizontal size={16} />
                            </div>
                        </div>

                        {/* Filter Chips */}
                        <div className="flex space-x-2 overflow-x-auto pb-4 mb-2 filter-scroll-row" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                            <style>{`
                                .filter-scroll-row::-webkit-scrollbar { display: none; }
                            `}</style>
                            {(['All', 'Verified', 'Pending', 'Draft', 'This month', 'Newest'] as FilterType[]).map(filter => {
                                const isActive = activeFilter === filter;
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={clsx(
                                            "flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors border",
                                            isActive 
                                                ? "bg-[#0B0F1A] text-white border-[#0B0F1A]" 
                                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        {filter}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Receipt List */}
                        <div className="flex-1 pb-4">
                            {filteredReceipts.length === 0 ? (
                                <div className="text-center py-16">
                                    <p className="text-gray-500 font-medium">No receipts found.</p>
                                </div>
                            ) : (
                                sortedCategoryNames.map((cat) => {
                                    const { receipts } = groupedReceipts[cat];
                                    return (
                                        <div key={cat} className="mb-6">
                                            {/* Static Category Divider */}
                                            <div className="flex items-center space-x-3 mb-4">
                                                <div className="h-[1px] flex-1 bg-gray-200"></div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                                                    {cat}
                                                </div>
                                                <div className="h-[1px] flex-1 bg-gray-200"></div>
                                            </div>

                                            {/* Cards */}
                                            <div className="space-y-3">
                                                {receipts.map(receipt => {
                                                    const status = getStatusStyle(receipt);
                                                    const isPendingOrDraft = status.label === 'Pending' || status.label === 'Draft';
                                                    
                                                    return (
                                                        <Link
                                                            href={receipt.receiptNumber ? `/receipt/${receipt.id}` : receipt.imageUrl || '#'}
                                                            key={receipt.id}
                                                            className="flex items-center p-3.5 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] transition-all"
                                                        >
                                                            {/* Icon Square */}
                                                            <div 
                                                                className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 mr-3"
                                                                style={{ backgroundColor: status.bg, color: status.text }}
                                                            >
                                                                <IconReceipt size={22} stroke={1.5} />
                                                            </div>
                                                            
                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0 pr-3">
                                                                <h4 className="text-[15px] font-bold text-gray-900 truncate">
                                                                    {receipt.clientName || receipt.receiptNumber || 'Unnamed Receipt'}
                                                                </h4>
                                                                <div className="flex items-center text-[13px] text-gray-500 mt-0.5 space-x-1.5">
                                                                    <span>{format(new Date(receipt.date || receipt.createdAt), 'MMM d, yyyy')}</span>
                                                                    {receipt.bundles && receipt.bundles.length > 0 && (
                                                                        <>
                                                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                                            <span className="text-[#5B5FEF] font-medium truncate">
                                                                                {receipt.bundles[0].bundle.name}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Right Amount & Status */}
                                                            <div className="flex flex-col items-end flex-shrink-0">
                                                                <span className={clsx("font-bold text-[15px] font-mono", isPendingOrDraft ? "text-gray-400" : "text-gray-900")}>
                                                                    ${Number(receipt.total || 0).toFixed(2)}
                                                                </span>
                                                                <div 
                                                                    className="flex items-center space-x-1 px-2 py-0.5 rounded-md mt-1.5 font-bold text-[10px] uppercase tracking-wider"
                                                                    style={{ backgroundColor: status.bg, color: status.text }}
                                                                >
                                                                    {status.icon}
                                                                    <span>{status.label}</span>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Inline Total Bar */}
                        {filteredReceipts.length > 0 && (
                            <div className="mt-2 mb-4 p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Amount</span>
                                    <span className="text-sm font-medium text-gray-800">{receiptCount} receipts</span>
                                </div>
                                <div className="text-[20px] font-bold font-mono text-gray-900">
                                    ${totalSpend.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

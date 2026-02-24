"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadButton from '@/components/UploadButton';
import Link from 'next/link';

type Receipt = {
    id: string;
    imageUrl: string;
    createdAt: string;
    clientName?: string | null;
    total?: number;
    taxValue?: number | null;
    date?: string;
    notes?: string | null;
    categoryId?: string | null;
    isFinalized?: boolean;
};

export default function UploadsPage() {
    const router = useRouter();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Edit Modal State
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [editForm, setEditForm] = useState({
        clientName: '',
        total: '',
        taxValue: '',
        date: '',
        notes: '',
        categoryId: ''
    });
    const [saving, setSaving] = useState(false);

    // Categories State
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [selectedUploadCategory, setSelectedUploadCategory] = useState<string>('');

    // Bundle Modal State
    const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
    const [selectedReceiptForBundle, setSelectedReceiptForBundle] = useState<Receipt | null>(null);
    const [userBundles, setUserBundles] = useState<any[]>([]);
    const [isBundlesLoading, setIsBundlesLoading] = useState(false);
    const [addingToBundleId, setAddingToBundleId] = useState<string | null>(null);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchReceipts = async () => {
        try {
            const res = await fetch('/api/uploaded-receipts');
            if (res.ok) {
                const data = await res.json();
                setReceipts(data);
            } else if (res.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch receipts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceipts();
        fetchCategories();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this receipt?')) return;

        try {
            const res = await fetch(`/api/receipts/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchReceipts(); // Refresh list
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleEditClick = (receipt: Receipt, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingReceipt(receipt);
        setEditForm({
            clientName: receipt.clientName || '',
            total: receipt.total?.toString() || '',
            taxValue: receipt.taxValue?.toString() || '',
            date: receipt.date ? new Date(receipt.date).toISOString().split('T')[0] : new Date(receipt.createdAt).toISOString().split('T')[0],
            notes: receipt.notes || '',
            categoryId: receipt.categoryId || ''
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReceipt) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/receipts/${editingReceipt.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: editForm.clientName,
                    total: parseFloat(editForm.total) || 0,
                    taxValue: parseFloat(editForm.taxValue) || null,
                    date: editForm.date,
                    notes: editForm.notes,
                    categoryId: editForm.categoryId || null
                })
            });

            if (res.ok) {
                setEditingReceipt(null);
                fetchReceipts();
            } else {
                alert('Failed to save receipt details');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenBundleModal = async (receipt: Receipt) => {
        setSelectedReceiptForBundle(receipt);
        setIsBundleModalOpen(true);
        setIsBundlesLoading(true);
        try {
            const res = await fetch('/api/bundles');
            if (res.ok) {
                const data = await res.json();
                setUserBundles(data);
            }
        } catch (error) {
            console.error('Failed to load bundles:', error);
        } finally {
            setIsBundlesLoading(false);
        }
    };

    const handleAddToBundle = async (bundleId: string) => {
        if (!selectedReceiptForBundle) return;
        setAddingToBundleId(bundleId);
        try {
            const res = await fetch(`/api/bundles/${bundleId}/add-receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiptId: selectedReceiptForBundle.id })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to add to bundle');
            } else {
                alert('Added to bundle successfully!');
                setIsBundleModalOpen(false);
            }
        } catch (error) {
            alert('Failed to add to bundle');
        } finally {
            setAddingToBundleId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1220] text-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-6">
                    <Link href="/history" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors mb-4 border border-gray-700/50 hover:bg-white/5 rounded-md px-3 py-1.5 w-fit">
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Receipts
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold text-gray-100">My Uploads</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={selectedUploadCategory}
                                onChange={(e) => setSelectedUploadCategory(e.target.value)}
                                className="bg-[#1F2937] border border-[#2D3748] text-sm rounded-lg px-3 h-11 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                            >
                                <option value="">No Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <UploadButton
                                onUploadComplete={fetchReceipts}
                                endpoint={selectedUploadCategory ? `/api/uploaded-receipts?categoryId=${selectedUploadCategory}` : "/api/uploaded-receipts"}
                            />
                        </div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-[#1F2937] rounded-xl shadow border border-[#2D3748] p-6">
                    {loading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : receipts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                            <p>No uploaded receipts found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {receipts.map((receipt) => (
                                <div key={receipt.id} className="relative group bg-[#111827] rounded-lg overflow-hidden border border-[#2D3748] shadow-sm flex flex-col">
                                    <div
                                        className="aspect-w-3 aspect-h-4 relative h-64 cursor-pointer"
                                        onClick={() => setSelectedImage(receipt.imageUrl)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={receipt.imageUrl}
                                            alt="Receipt"
                                            className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
                                            loading="lazy"
                                        />

                                        {/* Status Overlay for Metadata */}
                                        {(receipt.clientName || receipt.total) && (
                                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 pointer-events-none">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm font-medium text-white truncate drop-shadow-md">
                                                        {receipt.clientName || 'Store'}
                                                    </span>
                                                    {receipt.total ? (
                                                        <span className="text-sm font-bold text-green-400 drop-shadow-md whitespace-nowrap ml-2">
                                                            ${receipt.total.toFixed(2)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-[#111827] p-3 border-t border-[#2D3748] flex flex-col z-10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-gray-400">
                                                {new Date(receipt.date || receipt.createdAt).toLocaleDateString()}
                                            </span>
                                            {receipt.isFinalized && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100/10 text-gray-400 border border-gray-100/20 uppercase tracking-wider">
                                                    Finalized
                                                </span>
                                            )}
                                        </div>
                                        {!receipt.isFinalized && (
                                            <div className="flex justify-between w-full border-t border-gray-800 pt-2 mt-1 gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenBundleModal(receipt); }}
                                                    className="text-indigo-400 hover:text-indigo-300 text-xs font-medium tracking-wide transition-colors"
                                                >
                                                    Bundle
                                                </button>
                                                <button
                                                    onClick={(e) => handleEditClick(receipt, e)}
                                                    className="text-gray-400 hover:text-gray-300 text-xs font-medium tracking-wide transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(receipt.id);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 text-xs font-medium tracking-wide transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 sm:p-8">
                    <div className="bg-[#1F2937] rounded-xl shadow-2xl border border-[#2D3748] w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#2D3748] flex justify-between items-center">
                            <h3 className="text-lg font-medium text-white">Edit Receipt Details</h3>
                            <button onClick={() => setEditingReceipt(null)} className="text-gray-400 hover:text-white">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Store / Client Name</label>
                                <input
                                    type="text"
                                    value={editForm.clientName}
                                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                    className="w-full bg-[#111827] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Home Depot"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Total ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.total}
                                        onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
                                        className="w-full bg-[#111827] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Tax ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.taxValue}
                                        onChange={(e) => setEditForm({ ...editForm, taxValue: e.target.value })}
                                        className="w-full bg-[#111827] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={editForm.date}
                                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                    className="w-full bg-[#111827] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full bg-[#111827] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                                <select
                                    value={editForm.categoryId}
                                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                                    className="w-full bg-[#111827] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">None</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingReceipt(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {saving ? 'Saving...' : 'Save Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Full-size Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 sm:p-8">
                    <div className="relative w-full h-full flex flex-col items-center justify-center max-w-5xl mx-auto">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 z-50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Ensure image maintains aspect ratio and fits within viewport */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedImage}
                            alt="Full Size Receipt"
                            className="max-h-full max-w-full object-contain rounded border border-gray-800 shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Add to Bundle Modal */}
            {isBundleModalOpen && selectedReceiptForBundle && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0F172A] border border-[#1F2937] rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-[#1F2937] flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-semibold text-white">Add to Bundle</h2>
                            <button onClick={() => setIsBundleModalOpen(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-400 mb-6 font-medium">
                                Select a bundle to add <strong className="text-gray-200">{selectedReceiptForBundle.clientName || 'this receipt'}</strong> to.
                            </p>

                            {isBundlesLoading ? (
                                <div className="text-center py-8 text-gray-500 animate-pulse">Loading bundles...</div>
                            ) : userBundles.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 text-sm mb-4">You have no bundles.</p>
                                    <Link href="/history?view=bundles" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                                        Create your first bundle →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {userBundles.map(bundle => (
                                        <div key={bundle.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-800 hover:border-gray-600 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex-1 pr-4">
                                                <p className="text-sm font-medium text-gray-200 line-clamp-1">{bundle.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">{bundle.receiptCount} receipts</p>
                                            </div>
                                            <button
                                                onClick={() => handleAddToBundle(bundle.id)}
                                                disabled={addingToBundleId === bundle.id}
                                                className="px-3 py-1.5 text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {addingToBundleId === bundle.id ? 'Adding...' : 'Add'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-[#1F2937] bg-[#0B1220] rounded-b-xl text-center shrink-0">
                            <Link href="/history?view=bundles" className="text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors">
                                Manage Bundles
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

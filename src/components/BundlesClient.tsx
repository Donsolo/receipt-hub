"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Bundle = {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    receiptCount: number;
    totalAmount: number;
};

export default function BundlesClient() {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state for create/edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchBundles();
    }, []);

    const fetchBundles = async () => {
        try {
            const res = await fetch('/api/bundles');
            if (!res.ok) throw new Error('Failed to fetch bundles');
            const data = await res.json();
            setBundles(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (bundle?: Bundle) => {
        if (bundle) {
            setEditingBundle(bundle);
            setName(bundle.name);
            setDescription(bundle.description || '');
        } else {
            setEditingBundle(null);
            setName('');
            setDescription('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const method = editingBundle ? 'PUT' : 'POST';
            const url = editingBundle ? `/api/bundles/${editingBundle.id}` : '/api/bundles';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });

            if (!res.ok) throw new Error('Failed to save bundle');
            await fetchBundles();
            setIsModalOpen(false);

            if (!editingBundle) {
                setToastMessage('Bundle created successfully.');
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the bundle "${name}"? Receipts inside it will NOT be deleted.`)) return;

        try {
            const res = await fetch(`/api/bundles/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete bundle');
            setBundles(prev => prev.filter(b => b.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading bundles...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="w-full p-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-100">Receipt Bundles</h3>
                    <p className="text-sm text-gray-400 mt-1">Group and organize receipts manually to send as a snapshot.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-indigo-500/25"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Bundle
                </button>
            </div>

            {bundles.length === 0 ? (
                <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-12 text-center">
                    <div className="h-16 w-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-200">No Bundles Yet</h3>
                    <p className="text-gray-400 mt-2 max-w-md mx-auto text-sm leading-relaxed">
                        Create bundles to group receipts together. You can add receipts to bundles from your history and safely send them to your connections.
                    </p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-[#2D3748] border border-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Create Your First Bundle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bundles.map((bundle) => (
                        <div key={bundle.id} className="bg-[#0F172A] border border-white/5 rounded-xl hover:border-gray-700 transition-colors flex flex-col overflow-hidden shadow-sm group">
                            <div className="p-5 flex-1 cursor-default">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-lg font-semibold text-gray-100 line-clamp-1 pr-4">{bundle.name}</h2>
                                    <div className="relative hover:bg-gray-800 rounded-md p-1 transition-colors group/menu">
                                        <button className="text-gray-500 hover:text-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                            </svg>
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 w-36 bg-[#1F2937] border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                                            <button onClick={() => handleOpenModal(bundle)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">Edit Details</button>
                                            <button onClick={() => handleDelete(bundle.id, bundle.name)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">Delete Bundle</button>
                                        </div>
                                    </div>
                                </div>
                                {bundle.description && (
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{bundle.description}</p>
                                )}
                                <div className="mt-5 grid grid-cols-2 gap-4">
                                    <div className="bg-[#0B1220] rounded-lg p-3 border border-white/5 shadow-inner">
                                        <p className="text-[11px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">Receipts</p>
                                        <p className="text-lg font-bold text-gray-200">{bundle.receiptCount}</p>
                                    </div>
                                    <div className="bg-[#0B1220] rounded-lg p-3 border border-white/5 shadow-inner flex flex-col items-end">
                                        <p className="text-[11px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">Total</p>
                                        <p className="text-lg font-bold text-emerald-400">${bundle.totalAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-4 border-t border-white/5 bg-[#141A29] flex items-center justify-between gap-3">
                                <Link
                                    href={`/dashboard/bundles/${bundle.id}`}
                                    className="flex-1 flex justify-center items-center py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Open Bundle
                                </Link>
                                <Link
                                    href="/dashboard/connections"
                                    className="flex justify-center items-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                    Send
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0F172A] border border-[#1F2937] rounded-xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-[#1F2937] flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white">{editingBundle ? 'Edit Bundle' : 'Create New Bundle'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Bundle Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#1A2234] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Q4 Taxes 2026"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#1A2234] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                                    placeholder="Brief details about what goes here..."
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={isSaving || !name.trim()} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSaving ? 'Saving...' : (editingBundle ? 'Save Changes' : 'Create Bundle')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-[#10b981] text-white px-4 py-3 rounded-lg shadow-xl shadow-emerald-900/20 flex items-center font-medium tracking-wide text-sm border border-[#059669]">
                        <svg className="w-5 h-5 mr-2 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {toastMessage}
                    </div>
                </div>
            )}
        </div>
    );
}

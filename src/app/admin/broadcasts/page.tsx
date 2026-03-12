"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type BroadcastMessage = {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'UPDATE' | 'WARNING' | 'SUCCESS';
    target: 'ALL_USERS' | 'FREE_USERS' | 'PRO_USERS' | 'BUSINESS_USERS';
    createdBy: string;
    createdAt: string;
    expiresAt: string | null;
    isActive: boolean;
    dismissible: boolean;
    viewCount: number;
};

export default function AdminBroadcastsPage() {
    const router = useRouter();
    const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formState, setFormState] = useState({
        title: '',
        message: '',
        type: 'INFO' as BroadcastMessage['type'],
        target: 'ALL_USERS' as BroadcastMessage['target'],
        expiresAt: '',
        dismissible: true
    });

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    const fetchBroadcasts = async () => {
        try {
            const res = await fetch('/api/admin/broadcasts');
            if (res.ok) {
                const data = await res.json();
                setBroadcasts(data);
            } else if (res.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch broadcasts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (broadcast?: BroadcastMessage) => {
        if (broadcast) {
            setEditingId(broadcast.id);
            setFormState({
                title: broadcast.title,
                message: broadcast.message,
                type: broadcast.type,
                target: broadcast.target,
                expiresAt: broadcast.expiresAt ? new Date(broadcast.expiresAt).toISOString().split('T')[0] : '',
                dismissible: broadcast.dismissible
            });
        } else {
            setEditingId(null);
            setFormState({
                title: '',
                message: '',
                type: 'INFO',
                target: 'ALL_USERS',
                expiresAt: '',
                dismissible: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.title.trim() || !formState.message.trim()) return;

        setIsSubmitting(true);
        try {
            const endpoint = editingId
                ? `/api/admin/broadcasts/${editingId}`
                : '/api/admin/broadcasts/create';

            const res = await fetch(endpoint, {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState)
            });

            if (res.ok) {
                const result = await res.json();
                if (editingId) {
                    setBroadcasts(broadcasts.map(b => b.id === editingId ? result : b));
                } else {
                    setBroadcasts([result, ...broadcasts]);
                }
                setIsModalOpen(false);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save broadcast.');
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/broadcasts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive })
            });

            if (res.ok) {
                const updated = await res.json();
                setBroadcasts(broadcasts.map(b => b.id === id ? updated : b));
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this broadcast? This will remove all engagement data.')) return;

        try {
            const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBroadcasts(broadcasts.filter(b => b.id !== id));
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    };

    const activeBroadcasts = broadcasts.filter(b => b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date()));
    const pastBroadcasts = broadcasts.filter(b => !b.isActive || (b.expiresAt && new Date(b.expiresAt) <= new Date()));

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-[var(--card-hover)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--text)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text)]">Global Broadcasts</h1>
                            <p className="text-sm text-[var(--muted)]">Manage platform-wide messages and alerts.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Create Broadcast
                    </button>
                </div>

                {/* Active Broadcasts Section */}
                <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-emerald-500/[0.02] flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-[var(--text)]">Active Broadcasts</h2>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Live</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#1F2937]">
                            <thead className="bg-[var(--bg)]/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Target</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Views</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Expires</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2937]">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-[var(--muted)] animate-pulse">Loading...</td></tr>
                                ) : activeBroadcasts.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-[var(--muted)]">No active broadcasts.</td></tr>
                                ) : (
                                    activeBroadcasts.map(b => (
                                        <tr key={b.id} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-[var(--text)]">{b.title}</div>
                                                <div className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[150px]">{b.id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${b.type === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    b.type === 'WARNING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        b.type === 'UPDATE' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {b.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[11px] text-[var(--muted)] uppercase font-medium">
                                                {b.target.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)] font-medium">
                                                {b.viewCount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--muted)]">
                                                {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                                                <button onClick={() => handleOpenModal(b)} className="text-indigo-400 hover:text-indigo-300">Edit</button>
                                                <button onClick={() => handleToggleActive(b.id, b.isActive)} className="text-amber-500 hover:text-amber-400">Disable</button>
                                                <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Past/Inactive Broadcasts Section */}
                <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm opacity-80">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-gray-500/[0.02]">
                        <h2 className="text-lg font-semibold text-[var(--text)]">Past & Inactive</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#1F2937]">
                            <thead className="bg-[var(--bg)]/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Target</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Views</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2937]">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-[var(--muted)] animate-pulse">Loading...</td></tr>
                                ) : pastBroadcasts.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-[var(--muted)]">No past history.</td></tr>
                                ) : (
                                    pastBroadcasts.map(b => (
                                        <tr key={b.id} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-[var(--muted)]">{b.title}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider bg-gray-500/10 text-gray-400 border-gray-500/20`}>
                                                    {!b.isActive ? 'Disabled' : 'Expired'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[11px] text-[var(--muted)] uppercase">
                                                {b.target.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                                {b.viewCount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                                                <button onClick={() => handleToggleActive(b.id, b.isActive)} className="text-emerald-500 hover:text-emerald-400">Enable</button>
                                                <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-lg font-bold text-[var(--text)]">
                                {editingId ? 'Edit Broadcast' : 'Create New Broadcast'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formState.title}
                                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-emerald-500"
                                    placeholder="Maintenance Alert"
                                    maxLength={100}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Message Body</label>
                                <textarea
                                    required
                                    value={formState.message}
                                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-emerald-500 min-h-[120px] resize-none"
                                    placeholder="We will be undergoing scheduled maintenance..."
                                    maxLength={2000}
                                />
                                <div className="text-[10px] text-right text-[var(--muted)] mt-1">
                                    {formState.message.length} / 2000
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Message Type</label>
                                    <select
                                        value={formState.type}
                                        onChange={(e) => setFormState({ ...formState, type: e.target.value as any })}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="INFO">Info (Blue)</option>
                                        <option value="UPDATE">Update (Purple)</option>
                                        <option value="WARNING">Warning (Orange)</option>
                                        <option value="SUCCESS">Success (Green)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Target Audience</label>
                                    <select
                                        value={formState.target}
                                        onChange={(e) => setFormState({ ...formState, target: e.target.value as any })}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="ALL_USERS">All Users</option>
                                        <option value="FREE_USERS">Free (Core)</option>
                                        <option value="PRO_USERS">Pro Users</option>
                                        <option value="BUSINESS_USERS">Business Users</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Expiration Date</label>
                                    <input
                                        type="date"
                                        value={formState.expiresAt}
                                        onChange={(e) => setFormState({ ...formState, expiresAt: e.target.value })}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Dismissible</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormState({ ...formState, dismissible: !formState.dismissible })}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formState.dismissible ? 'bg-emerald-600' : 'bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formState.dismissible ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-[var(--text)] text-sm font-medium py-2.5 rounded-lg border border-[var(--border)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 px-8 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {isSubmitting ? 'Sending...' : editingId ? 'Update Broadcast' : 'Send Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

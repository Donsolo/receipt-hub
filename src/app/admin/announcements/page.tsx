"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminAnnouncementsPage() {
    const router = useRouter();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [formState, setFormState] = useState({
        title: '',
        content: '',
        type: 'ANNOUNCEMENT',
        isActive: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch('/api/admin/announcements');
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data);
            } else if (res.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.title.trim() || !formState.content.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState)
            });

            if (res.ok) {
                const created = await res.json();
                setAnnouncements([created, ...announcements]);
                setFormState({ title: '', content: '', type: 'ANNOUNCEMENT', isActive: true });
            } else {
                alert('Failed to create announcement.');
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive })
            });

            if (res.ok) {
                const updated = await res.json();
                setAnnouncements(announcements.map(a => a.id === id ? updated : a));
            } else {
                alert('Failed to update status.');
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to completely delete this? Users who haven\'t seen it yet will never see it.')) return;

        try {
            const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAnnouncements(announcements.filter(a => a.id !== id));
            } else {
                alert('Failed to delete announcement.');
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/admin" className="p-2 hover:bg-[var(--card-hover)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--text)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">Announcements & Popups</h1>
                        <p className="text-sm text-[var(--muted)]">Manage dynamic modals served to users post-login.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Form */}
                    <div className="lg:col-span-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 h-fit shadow-sm">
                        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Create Notice</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formState.title}
                                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. A note to founders"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Content (HTML allowed)</label>
                                <textarea
                                    required
                                    value={formState.content}
                                    onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500 min-h-[150px] resize-y font-mono text-xs"
                                    placeholder="<p>Detailed message here...</p>"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Type</label>
                                    <select
                                        value={formState.type}
                                        onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="ANNOUNCEMENT">Announcement</option>
                                        <option value="CHANGELOG">Changelog</option>
                                        <option value="APOLOGY">Apology / Alert</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Status</label>
                                    <select
                                        value={formState.isActive.toString()}
                                        onChange={(e) => setFormState({ ...formState, isActive: e.target.value === 'true' })}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="true">Active (Live)</option>
                                        <option value="false">Draft</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formState.title.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
                            >
                                {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                            </button>
                        </form>
                    </div>

                    {/* Announcement Feed */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading ? (
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center animate-pulse">
                                <p className="text-sm text-[var(--muted)]">Loading announcements...</p>
                            </div>
                        ) : announcements.length === 0 ? (
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-[var(--text)] font-medium mb-1">No announcements active</h3>
                                <p className="text-sm text-[var(--muted)] max-w-sm">Create an announcement or changelog popup to display it to arriving users.</p>
                            </div>
                        ) : (
                            announcements.map(ann => (
                                <div key={ann.id} className={`bg-[var(--card)] border ${ann.isActive ? 'border-indigo-500/30 shadow-sm shadow-indigo-500/5' : 'border-[var(--border)]'} rounded-xl p-5 flex flex-col md:flex-row gap-5 transition-colors`}>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-base font-semibold text-[var(--text)]">{ann.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${ann.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-[var(--muted)] border-white/10'}`}>
                                                        {ann.isActive ? 'Active' : 'Draft'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${ann.type === 'APOLOGY' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : ann.type === 'CHANGELOG' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                        {ann.type}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--muted)] font-mono">ID: {ann.id} • Posted: {new Date(ann.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="bg-[var(--bg)]/50 rounded-md p-3 border border-[var(--border)] prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: ann.content }} />
                                    </div>

                                    <div className="flex md:flex-col items-center justify-end md:justify-start gap-2 shrink-0 md:w-28 pt-1">
                                        <button
                                            onClick={() => handleToggleActive(ann.id, ann.isActive)}
                                            className={`w-full text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${ann.isActive
                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                        >
                                            {ann.isActive ? 'Deactivate' : 'Publish'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ann.id)}
                                            className="w-full text-xs px-3 py-1.5 rounded-md font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

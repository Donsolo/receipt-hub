"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaperAirplaneIcon, UsersIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function GlobalMessagePage() {
    const router = useRouter();
    const [stats, setStats] = useState({ TOTAL: 0, FREE: 0, PRO: 0, BUSINESS: 0 });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [formState, setFormState] = useState({
        subject: '',
        message: '',
        target: 'ALL_USERS'
    });

    useEffect(() => {
        // Fetch approximate user counts for the warning dialog
        fetch('/api/admin/global-message/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const confirmSend = async () => {
        setIsSubmitting(true);
        setShowConfirm(false);

        try {
            const res = await fetch('/api/admin/global-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState)
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Success! Message sent to ${result.count} users.`);
                setFormState({ subject: '', message: '', target: 'ALL_USERS' });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send messages.');
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const targetCount = stats[formState.target as keyof typeof stats] || 0;

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-[var(--card-hover)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--text)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">Global Direct Message</h1>
                        <p className="text-sm text-[var(--muted)]">Reach every user directly in their inbox.</p>
                    </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[var(--border)] bg-indigo-500/[0.02]">
                        <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                            <PaperAirplaneIcon className="h-5 w-5 text-indigo-400" />
                            Compose Message
                        </h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5 uppercase tracking-wider">Target Audience</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { id: 'ALL_USERS', label: 'All Users' },
                                    { id: 'FREE_USERS', label: 'Free (Core)' },
                                    { id: 'PRO_USERS', label: 'Pro' },
                                    { id: 'BUSINESS_USERS', label: 'Business' }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setFormState({ ...formState, target: t.id })}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                                            formState.target === t.id 
                                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                                            : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5 uppercase tracking-wider">Subject (Optional)</label>
                            <input
                                type="text"
                                value={formState.subject}
                                onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g., Important Platform Update"
                                maxLength={100}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5 uppercase tracking-wider">Message Body</label>
                            <textarea
                                required
                                value={formState.message}
                                onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500 min-h-[200px] resize-none transition-colors"
                                placeholder="Write your message here..."
                                maxLength={3000}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-[10px] text-[var(--muted)]">Use standard text. HTML is not supported in DMs.</p>
                                <div className="text-[10px] text-[var(--muted)] font-mono">
                                    {formState.message.length} / 3000
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !formState.message.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Sending Batch...' : 'Prepare Send'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111827] border border-red-500/20 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-red-500">
                                <ShieldExclamationIcon className="h-10 w-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Critical Confirmation</h3>
                            <p className="text-sm text-gray-400">
                                You are about to send this message directly into the inboxes of <span className="text-white font-bold">{targetCount} users</span>. 
                                This process is permanent and cannot be undone.
                            </p>
                            
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-left">
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Preview</div>
                                <div className="text-xs text-white font-bold mb-1">{formState.subject || "No Subject"}</div>
                                <div className="text-[11px] text-gray-400 line-clamp-3">{formState.message}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSend}
                                    disabled={isSubmitting}
                                    className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors ring-offset-2 ring-offset-[#111827] focus:ring-2 focus:ring-red-500"
                                >
                                    Confirm & Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

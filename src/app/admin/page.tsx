"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UsageData = {
    totalUsers: number;
    activeUsers7d: number;
    totalReceipts: number;
    totalStorageMB: number;
    uploads24h: number;
    uploads7d: number;
};

type ActivationStats = {
    totalUsers: number;
    activatedUsers: number;
    earlyAccessUsers: number;
    inactiveUsers: number;
    estimatedRevenue: number;
};

export default function AdminPage() {
    const router = useRouter();
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [activationStats, setActivationStats] = useState<ActivationStats | null>(null);
    const [settings, setSettings] = useState<{ REQUIRE_ACTIVATION: boolean, EARLY_ACCESS_OPEN: boolean } | null>(null);
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);

    // Poll form state
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollDescription, setPollDescription] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);

    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [usageRes, settingsRes, actStatsRes, feedbackRes, pollsRes] = await Promise.all([
                fetch('/api/admin/usage'),
                fetch('/api/admin/settings'),
                fetch('/api/admin/activation-stats'),
                fetch('/api/admin/feedback'),
                fetch('/api/admin/polls')
            ]);

            if (usageRes.status === 401 || settingsRes.status === 401 || actStatsRes.status === 401) {
                router.push('/login');
                return;
            }

            let fetchedUsage = null;
            if (usageRes.ok) {
                fetchedUsage = await usageRes.json();
                // We only store the top level metrics in usageData state 
                setUsageData({
                    totalUsers: fetchedUsage.totalUsers,
                    activeUsers7d: fetchedUsage.activeUsers7d,
                    totalReceipts: fetchedUsage.totalReceipts,
                    totalStorageMB: fetchedUsage.totalStorageMB,
                    uploads24h: fetchedUsage.uploads24h,
                    uploads7d: fetchedUsage.uploads7d,
                });
            }

            if (settingsRes.ok) {
                const fetchedSettings = await settingsRes.json();
                setSettings(fetchedSettings);
            }

            if (actStatsRes.ok) {
                const fetchedActStats = await actStatsRes.json();
                setActivationStats(fetchedActStats);
            }

            if (feedbackRes.ok) {
                const fetchedFeedbacks = await feedbackRes.json();
                setFeedbacks(fetchedFeedbacks);
            }

            if (pollsRes.ok) {
                const fetchedPolls = await pollsRes.json();
                setPolls(fetchedPolls);
            }

        } catch (error) {
            // Silently handle
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); const handleToggleSetting = async (key: 'REQUIRE_ACTIVATION' | 'EARLY_ACCESS_OPEN') => {
        if (!settings) return;

        const newValue = !settings[key];
        // Optimistic update
        setSettings({ ...settings, [key]: newValue });

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: newValue })
            });
            if (!res.ok) {
                // Revert on failure
                setSettings(settings);
                alert('Failed to update setting');
            }
        } catch (error) {
            setSettings(settings);
            alert('A network error occurred.');
        }
    };

    const handleFeedbackAction = async (id: string, action: 'approve' | 'showcase', currentValue: boolean) => {
        const payload = action === 'approve' ? { isApproved: !currentValue } : { isShowcased: !currentValue };

        try {
            const res = await fetch(`/api/admin/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updatedFeedback = await res.json();
                setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, ...updatedFeedback } : f));
            } else {
                alert(`Failed to update feedback ${action} status`);
            }
        } catch (err) {
            alert('Network error updating feedback');
        }
    };

    const handleAddPollOption = () => {
        setPollOptions([...pollOptions, '']);
    };

    const handleRemovePollOption = (index: number) => {
        if (pollOptions.length <= 2) return;
        const newOpts = [...pollOptions];
        newOpts.splice(index, 1);
        setPollOptions(newOpts);
    };

    const handlePollOptionChange = (index: number, value: string) => {
        const newOpts = [...pollOptions];
        newOpts[index] = value;
        setPollOptions(newOpts);
    };

    const handleCreatePoll = async (e: React.FormEvent) => {
        e.preventDefault();

        const validOptions = pollOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            alert('At least 2 valid options are required.');
            return;
        }

        setIsSubmittingPoll(true);
        try {
            const res = await fetch('/api/admin/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: pollQuestion,
                    description: pollDescription,
                    options: validOptions
                })
            });

            if (res.ok) {
                const newPoll = await res.json();
                setPolls([newPoll, ...polls]);
                setPollQuestion('');
                setPollDescription('');
                setPollOptions(['', '']);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create poll');
            }
        } catch (error) {
            alert('A network error occurred creating the poll.');
        } finally {
            setIsSubmittingPoll(false);
        }
    };

    const handleTogglePollActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/polls/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive })
            });
            if (res.ok) {
                const updated = await res.json();
                setPolls(polls.map(p => p.id === id ? updated : p));
            }
        } catch (e) {
            alert('Error toggling poll status');
        }
    };

    const handleDeletePoll = async (id: string) => {
        if (!confirm('Are you sure you want to completely delete this poll? All votes will be lost.')) return;
        try {
            const res = await fetch(`/api/admin/polls/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPolls(polls.filter(p => p.id !== id));
            }
        } catch (e) {
            alert('Error deleting poll');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="flex flex-col gap-1 mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text)]">Admin Dashboard</h1>
                    <p className="text-sm text-[var(--muted)]">Platform control and operational overview.</p>
                </div>

                {/* Activation Overview Section */}
                <section>
                    {loading ? (
                        <div className="text-sm text-[var(--muted)] animate-pulse">Loading overview...</div>
                    ) : activationStats ? (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-[var(--card)] border-t-2 border-t-indigo-500 rounded-b-md p-4 shadow-sm flex flex-col justify-center">
                                <div className="text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Total Users</div>
                                <div className="text-2xl font-bold text-[var(--text)]">{activationStats.totalUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] border-t-2 border-t-emerald-500 rounded-b-md p-4 shadow-sm flex flex-col justify-center">
                                <div className="text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Paid Activations</div>
                                <div className="text-2xl font-bold text-[var(--text)]">{activationStats.activatedUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] border-t-2 border-t-amber-500 rounded-b-md p-4 shadow-sm flex flex-col justify-center">
                                <div className="text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Early Access</div>
                                <div className="text-2xl font-bold text-[var(--text)]">{activationStats.earlyAccessUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] border-t-2 border-t-gray-600 rounded-b-md p-4 shadow-sm flex flex-col justify-center">
                                <div className="text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Inactive Accounts</div>
                                <div className="text-2xl font-bold text-[var(--text)]">{activationStats.inactiveUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] border-t-2 border-t-emerald-400 rounded-b-md p-4 shadow-sm flex flex-col justify-center">
                                <div className="text-xs font-medium text-[var(--muted)] mb-1 uppercase tracking-wider">Estimated Revenue</div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    ${activationStats.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-400">Failed to load overview stats.</div>
                    )}
                </section>

                {/* System Controls Section */}
                <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-white/[0.02]">
                        <h2 className="text-lg font-semibold text-[var(--text)]">System Controls</h2>
                    </div>
                    <div className="divide-y divide-[#1F2937]">
                        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                            <div>
                                <h3 className="text-sm font-medium text-[var(--text)]">Require Workspace Activation</h3>
                                <p className="text-xs text-[var(--muted)] mt-0.5">If enabled, standard users must pay or be early access to use the platform.</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <span className={`text-xs font-medium ${settings?.REQUIRE_ACTIVATION ? 'text-indigo-400' : 'text-[var(--muted)]'}`}>
                                    {settings?.REQUIRE_ACTIVATION ? 'Active Payload Gateway' : 'Free Access Mode'}
                                </span>
                                <button
                                    onClick={() => handleToggleSetting('REQUIRE_ACTIVATION')}
                                    disabled={!settings}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${settings?.REQUIRE_ACTIVATION ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings?.REQUIRE_ACTIVATION ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                            <div>
                                <h3 className="text-sm font-medium text-[var(--text)]">Early Access Window</h3>
                                <p className="text-xs text-[var(--muted)] mt-0.5">If open, new signups automatically bypass the activation paywall forever.</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <span className={`text-xs font-medium ${settings?.EARLY_ACCESS_OPEN ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {settings?.EARLY_ACCESS_OPEN ? 'Open for Registration' : 'Closed - Paywall Enforced'}
                                </span>
                                <button
                                    onClick={() => handleToggleSetting('EARLY_ACCESS_OPEN')}
                                    disabled={!settings}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${settings?.EARLY_ACCESS_OPEN ? 'bg-emerald-600' : 'bg-red-900/60'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings?.EARLY_ACCESS_OPEN ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Platform Usage Metrics Section */}
                <section>
                    <h2 className="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wider">Platform Usage</h2>
                    {loading ? (
                        <div className="text-sm text-[var(--muted)] animate-pulse">Loading usage statistics...</div>
                    ) : usageData ? (
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="bg-[var(--card)] rounded p-3 flex flex-col justify-center border border-transparent hover:border-[var(--border)] transition-colors">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-medium">Total Users</div>
                                <div className="text-lg font-semibold text-[var(--text)]">{usageData.totalUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] rounded p-3 flex flex-col justify-center border border-transparent hover:border-[var(--border)] transition-colors">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-medium">Active (7d)</div>
                                <div className="text-lg font-semibold text-[var(--text)]">
                                    {usageData.activeUsers7d.toLocaleString()}
                                    <span className="text-[10px] text-[var(--muted)] ml-1 font-normal">({usageData.totalUsers > 0 ? ((usageData.activeUsers7d / usageData.totalUsers) * 100).toFixed(0) : 0}%)</span>
                                </div>
                            </div>
                            <div className="bg-[var(--card)] rounded p-3 flex flex-col justify-center border border-transparent hover:border-[var(--border)] transition-colors">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-medium">Receipts</div>
                                <div className="text-lg font-semibold text-[var(--text)]">{usageData.totalReceipts.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] rounded p-3 flex flex-col justify-center border border-transparent hover:border-[var(--border)] transition-colors">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-medium">Storage</div>
                                <div className="text-lg font-semibold text-[var(--text)]">{usageData.totalStorageMB.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[10px] text-[var(--muted)] font-normal">MB</span></div>
                            </div>
                            <div className="bg-[var(--card)] rounded p-3 flex flex-col justify-center border border-transparent hover:border-[var(--border)] transition-colors">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-medium">Uploads 24h</div>
                                <div className="text-lg font-semibold text-[var(--text)]">{usageData.uploads24h.toLocaleString()}</div>
                            </div>
                            <div className="bg-[var(--card)] rounded p-3 flex flex-col justify-center border border-transparent hover:border-[var(--border)] transition-colors">
                                <div className="text-[11px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-medium">Uploads 7d</div>
                                <div className="text-lg font-semibold text-[var(--text)]">{usageData.uploads7d.toLocaleString()}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-400">Failed to load platform usage data.</div>
                    )}
                </section>

                {/* Community & Users Container */}
                <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-white/[0.02]">
                        <h2 className="text-lg font-semibold text-[var(--text)]">Community & Users</h2>
                    </div>

                    <div className="divide-y divide-[#1F2937]">
                        {/* Feedback Management Sub-section */}
                        <div className="p-6">
                            <h3 className="text-sm font-semibold text-[var(--muted)] mb-4 uppercase tracking-wider">Feedback Management</h3>
                            <div className="border border-[var(--border)] rounded-md overflow-x-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                <table className="min-w-full divide-y divide-[#1F2937]">
                                    <thead className="bg-[var(--bg)]/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap w-[20%]">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap w-[15%]">Type / Rating</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider w-[40%]">Message</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap w-[10%]">Date</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap w-[15%]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1F2937]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--muted)] animate-pulse">Loading feedback...</td>
                                            </tr>
                                        ) : feedbacks.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--muted)]">No feedback submitted yet.</td>
                                            </tr>
                                        ) : (
                                            feedbacks.map((fb) => (
                                                <tr key={fb.id} className="hover:bg-[var(--card-hover)] transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text)]">
                                                        <div className="font-medium max-w-[150px] truncate" title={fb.user?.businessName || fb.user?.name || 'Unknown'}>{fb.user?.businessName || fb.user?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-[var(--muted)] max-w-[150px] truncate" title={fb.user?.email}>{fb.user?.email}</div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${fb.type === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            fb.type === 'bug' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                            }`}>
                                                            {fb.type}
                                                        </span>
                                                        {fb.rating && (
                                                            <div className="mt-1 flex gap-0.5 text-[10px] text-yellow-500/80">
                                                                {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-[var(--text)]">
                                                        <div className="max-w-[200px] md:max-w-xs xl:max-w-md truncate" title={fb.message}>
                                                            {fb.message}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--muted)]">
                                                        {new Date(fb.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        <button
                                                            onClick={() => handleFeedbackAction(fb.id, 'approve', fb.isApproved)}
                                                            className={`px-2.5 py-1 rounded text-xs transition-colors border ${fb.isApproved
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                : 'bg-white/5 text-[var(--muted)] border-[var(--border)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]'
                                                                }`}
                                                        >
                                                            {fb.isApproved ? 'Approved' : 'Approve'}
                                                        </button>

                                                        {fb.type === 'positive' && (
                                                            <button
                                                                onClick={() => handleFeedbackAction(fb.id, 'showcase', fb.isShowcased)}
                                                                className={`px-2.5 py-1 rounded text-xs transition-colors border ${fb.isShowcased
                                                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                                                                    : 'bg-white/5 text-[var(--muted)] border-[var(--border)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]'
                                                                    }`}
                                                            >
                                                                {fb.isShowcased ? 'Showcased' : 'Showcase'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Polls Management Sub-section */}
                        <div className="p-6">
                            <h3 className="text-sm font-semibold text-[var(--muted)] mb-4 uppercase tracking-wider">Community Polls</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Create Poll Form */}
                                <div className="lg:col-span-1 bg-[var(--bg)]/50 border border-[var(--border)] rounded-md p-5 h-fit">
                                    <h4 className="text-sm font-medium text-[var(--text)] mb-4">Create New Poll</h4>
                                    <form onSubmit={handleCreatePoll} className="space-y-3">
                                        <div>
                                            <input
                                                type="text"
                                                required
                                                value={pollQuestion}
                                                onChange={(e) => setPollQuestion(e.target.value)}
                                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500"
                                                placeholder="Question (e.g. Next feature?)"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={pollDescription}
                                                onChange={(e) => setPollDescription(e.target.value)}
                                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500"
                                                placeholder="Optional context..."
                                            />
                                        </div>
                                        <div>
                                            <div className="space-y-2">
                                                {pollOptions.map((opt, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            required
                                                            value={opt}
                                                            onChange={(e) => handlePollOptionChange(i, e.target.value)}
                                                            className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500"
                                                            placeholder={`Option ${i + 1}`}
                                                        />
                                                        {pollOptions.length > 2 && (
                                                            <button type="button" onClick={() => handleRemovePollOption(i)} className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddPollOption}
                                                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingPoll || !pollQuestion.trim()}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-[var(--text)] text-sm font-medium py-2 rounded transition-colors disabled:opacity-50 mt-1"
                                        >
                                            {isSubmittingPoll ? 'Creating...' : 'Create Poll'}
                                        </button>
                                    </form>
                                </div>

                                {/* Polls List */}
                                <div className="lg:col-span-2 space-y-3">
                                    {polls.length === 0 ? (
                                        <div className="bg-[var(--bg)]/50 border border-[var(--border)] rounded-md p-6 text-center text-sm text-[var(--muted)]">
                                            No polls created yet.
                                        </div>
                                    ) : (
                                        polls.map(poll => (
                                            <div key={poll.id} className={`bg-[var(--bg)]/50 border ${poll.isActive ? 'border-indigo-500/30' : 'border-[var(--border)]'} rounded-md p-4 flex flex-col transition-colors`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="text-sm font-medium text-[var(--text)]">{poll.question}</h5>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${poll.isActive ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-[var(--card)]/50 text-[var(--muted)] border-[var(--border)]'}`}>
                                                                {poll.isActive ? 'Active' : 'Closed'}
                                                            </span>
                                                        </div>
                                                        {poll.description && (
                                                            <p className="text-xs text-[var(--muted)] mt-1">{poll.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleTogglePollActive(poll.id, poll.isActive)}
                                                            className={`text-xs px-2.5 py-1 rounded transition-colors ${poll.isActive ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                                                        >
                                                            {poll.isActive ? 'Close' : 'Re-open'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePoll(poll.id)}
                                                            className="p-1 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Delete Poll"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    {poll.options.map((opt: any) => {
                                                        const totalVotes = poll._count?.votes || 0;
                                                        const optVotes = opt._count?.votes || 0;
                                                        const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;

                                                        return (
                                                            <div key={opt.id} className="relative">
                                                                <div className="flex justify-between items-center relative z-10 px-2.5 py-1.5">
                                                                    <span className="text-xs text-[var(--text)]">{opt.text}</span>
                                                                    <span className="text-xs text-[var(--muted)]">{optVotes} ({percentage}%)</span>
                                                                </div>
                                                                <div className="absolute inset-0 bg-[var(--card)] rounded border border-[var(--border)] overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-indigo-500/10 transition-all duration-500"
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Management Links Sub-section */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Management Tools</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Announcements Card */}
                                <div className="bg-[var(--bg)]/50 border border-[var(--border)] rounded-md p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-fuchsia-500/10 flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-[var(--text)] font-medium mb-1">Announcements & Popups</h4>
                                    <p className="text-sm text-[var(--muted)] mb-5 max-w-xs">Create, manage, and track dynamic modals served to users on login.</p>
                                    <Link href="/admin/announcements" className="bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/20 text-sm font-medium px-6 py-2 rounded-md transition-colors w-full max-w-[200px]">
                                        Manage Popups
                                    </Link>
                                </div>

                                {/* User Directory Card */}
                                <div className="bg-[var(--bg)]/50 border border-[var(--border)] rounded-md p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-[var(--text)] font-medium mb-1">Manage All Users</h4>
                                    <p className="text-sm text-[var(--muted)] mb-5 max-w-xs">View, search, and manage user accounts, subscriptions, and receipts.</p>
                                    <Link href="/admin/users" className="bg-indigo-600 hover:bg-indigo-500 text-[var(--text)] text-sm font-medium px-6 py-2 rounded-md transition-colors w-full max-w-[200px]">
                                        Open User Directory
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

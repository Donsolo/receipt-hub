"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type UnifiedUser = {
    id: string;
    email: string;
    createdAt: string;
    role: string;
    name: string;
    plan: string;
    receiptCount: number;
    storageMB: number;
    lastUploadDate: string | null;
};

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
    const [users, setUsers] = useState<UnifiedUser[]>([]);
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [activationStats, setActivationStats] = useState<ActivationStats | null>(null);
    const [settings, setSettings] = useState<{ REQUIRE_ACTIVATION: boolean, EARLY_ACCESS_OPEN: boolean } | null>(null);
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [usersRes, usageRes, settingsRes, actStatsRes, feedbackRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/usage'),
                fetch('/api/admin/settings'),
                fetch('/api/admin/activation-stats'),
                fetch('/api/admin/feedback')
            ]);

            if (usersRes.status === 401 || usageRes.status === 401 || settingsRes.status === 401 || actStatsRes.status === 401) {
                router.push('/login');
                return;
            }

            let fetchedUsers = [];
            let fetchedUsage = null;

            if (usersRes.ok) {
                fetchedUsers = await usersRes.json();
            }
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

            // Merge datasets in memory
            if (fetchedUsers.length > 0) {
                const unified = fetchedUsers.map((u: any) => {
                    const usageInfo = fetchedUsage?.users?.find((usageUser: any) => usageUser.id === u.id);
                    return {
                        id: u.id,
                        email: u.email,
                        createdAt: u.createdAt,
                        role: u.role,
                        name: usageInfo?.name || u.email,
                        plan: usageInfo?.plan || 'Core (Early Access)',
                        receiptCount: usageInfo?.receiptCount || 0,
                        storageMB: usageInfo?.storageMB || 0.0,
                        lastUploadDate: usageInfo?.lastUploadDate || null,
                    };
                });
                setUsers(unified);
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
    }, []);

    const handleDeleteUser = async (id: string, email: string) => {
        if (!confirm(`Are you sure you want to delete user ${email} AND all their receipts (including images)? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            // Silently handle
        }
    };

    const handleToggleSetting = async (key: 'REQUIRE_ACTIVATION' | 'EARLY_ACCESS_OPEN') => {
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

    return (
        <div className="min-h-screen bg-[#0B1220] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
                </div>

                {/* Activation Overview Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-100 mb-6">Activation Overview</h2>
                    {loading ? (
                        <div className="text-sm text-gray-400 animate-pulse">Loading activation statistics...</div>
                    ) : activationStats ? (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Total Users</div>
                                <div className="text-2xl font-semibold text-gray-100">{activationStats.totalUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center border-t-2 border-t-indigo-500">
                                <div className="text-sm text-gray-400 mb-1">Paid Activations</div>
                                <div className="text-2xl font-semibold text-gray-100">{activationStats.activatedUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Early Access Users</div>
                                <div className="text-2xl font-semibold text-gray-100">{activationStats.earlyAccessUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Inactive Accounts</div>
                                <div className="text-2xl font-semibold text-gray-100">{activationStats.inactiveUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center border-t-2 border-t-emerald-500">
                                <div className="text-sm text-gray-400 mb-1">Estimated Core Revenue</div>
                                <div className="text-2xl font-semibold text-emerald-400">
                                    ${activationStats.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-400">Failed to load activation stats.</div>
                    )}
                </section>

                {/* System Settings Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-100 mb-6">System Controls</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#111827] border border-[#2D3748] rounded-md p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-200">Require Workspace Activation</h3>
                                <p className="text-sm text-gray-400 mt-1">If enabled, standard users must pay or be early access to use the platform.</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className={`text-sm font-medium ${settings?.REQUIRE_ACTIVATION ? 'text-indigo-400' : 'text-gray-500'}`}>
                                    {settings?.REQUIRE_ACTIVATION ? 'Active Payload Gateway' : 'Free Access Mode'}
                                </span>
                                <button
                                    onClick={() => handleToggleSetting('REQUIRE_ACTIVATION')}
                                    disabled={!settings}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings?.REQUIRE_ACTIVATION ? 'bg-indigo-600' : 'bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.REQUIRE_ACTIVATION ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#111827] border border-[#2D3748] rounded-md p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-200">Early Access Window</h3>
                                <p className="text-sm text-gray-400 mt-1">If open, new signups automatically bypass the activation paywall forever.</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className={`text-sm font-medium ${settings?.EARLY_ACCESS_OPEN ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {settings?.EARLY_ACCESS_OPEN ? 'Open for Registration' : 'Closed - Paywall Enforced'}
                                </span>
                                <button
                                    onClick={() => handleToggleSetting('EARLY_ACCESS_OPEN')}
                                    disabled={!settings}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings?.EARLY_ACCESS_OPEN ? 'bg-emerald-600' : 'bg-red-900/50'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.EARLY_ACCESS_OPEN ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Platform Usage Metrics Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-100 mb-6">Platform Usage</h2>
                    {loading ? (
                        <div className="text-sm text-gray-400 animate-pulse">Loading usage statistics...</div>
                    ) : usageData ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Total Users</div>
                                <div className="text-2xl font-semibold text-gray-100">{usageData.totalUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Active Users (7d)</div>
                                <div className="text-2xl font-semibold text-gray-100">{usageData.activeUsers7d.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {usageData.totalUsers > 0 ? ((usageData.activeUsers7d / usageData.totalUsers) * 100).toFixed(1) : 0}% of total users
                                </div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Total Receipts</div>
                                <div className="text-2xl font-semibold text-gray-100">{usageData.totalReceipts.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Total Storage (MB)</div>
                                <div className="text-2xl font-semibold text-gray-100">{usageData.totalStorageMB.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Uploads (24h)</div>
                                <div className="text-2xl font-semibold text-gray-100">{usageData.uploads24h.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                <div className="text-sm text-gray-400 mb-1">Uploads (7d)</div>
                                <div className="text-2xl font-semibold text-gray-100">{usageData.uploads7d.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mt-1">Last 7 days activity</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-400">Failed to load platform usage data.</div>
                    )}
                </section>

                {/* Feedback Management Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-100 mb-6">Feedback Management</h2>
                    <div className="bg-[#111827] border border-[#2D3748] rounded-md overflow-x-auto shadow-sm pb-4">
                        <table className="min-w-full divide-y divide-[#2D3748]">
                            <thead className="bg-[#1F2937]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Type / Rating</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Message</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2D3748]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">Loading feedback...</td>
                                    </tr>
                                ) : feedbacks.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">No feedback submitted yet.</td>
                                    </tr>
                                ) : (
                                    feedbacks.map((fb) => (
                                        <tr key={fb.id} className="hover:bg-[#1F2937] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                <div className="font-medium">{fb.user?.businessName || fb.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{fb.user?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${fb.type === 'positive' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50' :
                                                        fb.type === 'bug' ? 'bg-red-900/20 text-red-400 border-red-800/50' :
                                                            'bg-blue-900/20 text-blue-400 border-blue-800/50'
                                                    }`}>
                                                    {fb.type.toUpperCase()}
                                                </span>
                                                {fb.rating && (
                                                    <div className="mt-1 text-xs text-yellow-500">
                                                        {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                <div className="max-w-xs md:max-w-md lg:max-w-lg w-full truncate" title={fb.message}>
                                                    {fb.message}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {new Date(fb.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => handleFeedbackAction(fb.id, 'approve', fb.isApproved)}
                                                    className={`px-3 py-1 rounded text-xs border transition-colors ${fb.isApproved
                                                            ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/40'
                                                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {fb.isApproved ? 'Approved' : 'Approve'}
                                                </button>

                                                {fb.type === 'positive' && (
                                                    <button
                                                        onClick={() => handleFeedbackAction(fb.id, 'showcase', fb.isShowcased)}
                                                        className={`px-3 py-1 rounded text-xs border transition-colors ${fb.isShowcased
                                                                ? 'bg-indigo-900/40 text-indigo-300 border-indigo-800/50 hover:bg-indigo-900/60'
                                                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
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
                </section>

                {/* Unified Users Table Section */}
                <section>
                    <div className="bg-[#111827] border border-[#2D3748] rounded-md overflow-x-auto shadow-sm">
                        <table className="min-w-full divide-y divide-[#2D3748]">
                            <thead className="bg-[#1F2937]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Receipts</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Storage (MB)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Last Upload</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2D3748]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">Loading generic data...</td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-400">No users found.</td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr
                                            key={user.id}
                                            onClick={() => router.push(`/admin/users/${user.id}`)}
                                            className={`hover:bg-[#1F2937] transition-colors cursor-pointer ${user.role === 'SUPER_ADMIN' ? 'border-l-2 border-l-yellow-600' : ''}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-medium">
                                                {user.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${user.role === 'SUPER_ADMIN' ? 'bg-yellow-900/20 text-yellow-500 border-yellow-800/50' :
                                                    user.role === 'ADMIN' ? 'bg-blue-900/20 text-blue-400 border-blue-800/50' :
                                                        'bg-gray-800/50 text-gray-400 border-gray-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${user.plan === 'Pro' ? 'bg-purple-900/20 text-purple-400 border-purple-800/50' :
                                                    user.plan === 'Business' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50' :
                                                        'bg-gray-800/50 text-gray-400 border-gray-700'
                                                    }`}>
                                                    {user.plan}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {user.receiptCount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {user.storageMB.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {user.lastUploadDate ? new Date(user.lastUploadDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {new Date(user.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteUser(user.id, user.email);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 bg-red-900/20 px-3 py-1 rounded border border-transparent hover:border-red-900 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

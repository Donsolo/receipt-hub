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

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UnifiedUser[]>([]);
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [usersRes, usageRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/usage')
            ]);

            if (usersRes.status === 401 || usageRes.status === 401) {
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
                        plan: usageInfo?.plan || 'Free',
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

    return (
        <div className="min-h-screen bg-[#0B1220] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
                </div>

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

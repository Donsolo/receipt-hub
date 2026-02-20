"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
    id: string;
    email: string;
    createdAt: string;
    role: string;
};

type UsageUser = {
    id: string;
    name: string;
    email: string;
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
    users: UsageUser[];
};

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);

    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [usageLoading, setUsageLoading] = useState(true);

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

            if (usersRes.ok) {
                setUsers(await usersRes.json());
            }
            if (usageRes.ok) {
                setUsageData(await usageRes.json());
            }
        } catch (error) {
            // Silently handle
        } finally {
            setUsersLoading(false);
            setUsageLoading(false);
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

                {/* Platform Usage Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-100 mb-6">Platform Usage</h2>
                    {usageLoading ? (
                        <div className="text-sm text-gray-400 animate-pulse">Loading usage statistics...</div>
                    ) : usageData ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                    <div className="text-sm text-gray-400 mb-1">Total Users</div>
                                    <div className="text-2xl font-semibold text-gray-100">{usageData.totalUsers.toLocaleString()}</div>
                                </div>
                                <div className="bg-[#111827] border border-[#2D3748] rounded-md p-4 flex flex-col justify-center">
                                    <div className="text-sm text-gray-400 mb-1">Active Users (7d)</div>
                                    <div className="text-2xl font-semibold text-gray-100">{usageData.activeUsers7d.toLocaleString()}</div>
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
                                </div>
                            </div>

                            <div className="bg-[#111827] border border-[#2D3748] rounded-md overflow-x-auto shadow-sm">
                                <table className="min-w-full divide-y divide-[#2D3748]">
                                    <thead className="bg-[#1F2937]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Plan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Receipts</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Storage (MB)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Last Upload</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2D3748]">
                                        {usageData.users.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">No usage data found.</td>
                                            </tr>
                                        ) : (
                                            usageData.users.map(u => (
                                                <tr key={u.id} className="hover:bg-[#243043] transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-medium">{u.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{u.email}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                                                            {u.plan}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.receiptCount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.storageMB.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                        {u.lastUploadDate ? new Date(u.lastUploadDate).toLocaleDateString() : 'Never'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-400">Failed to load platform usage data.</div>
                    )}
                </section>

                {/* User Management Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-100 mb-6">User Management</h2>
                    <div className="bg-[#111827] border border-[#2D3748] rounded-md overflow-x-auto shadow-sm">
                        <table className="min-w-full divide-y divide-[#2D3748]">
                            <thead className="bg-[#1F2937]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2D3748]">
                                {usersLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">Loading users...</td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No users found.</td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-[#243043] transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-300">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${user.role === 'SUPER_ADMIN' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-800' :
                                                        user.role === 'ADMIN' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' :
                                                            'bg-gray-800 text-gray-300 border-gray-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
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

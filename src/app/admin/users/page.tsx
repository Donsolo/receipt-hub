"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    stripeCustomerId?: string | null;
};

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UnifiedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const topScrollRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const [tableWidth, setTableWidth] = useState(1100);

    const handleTopScroll = () => {
        if (tableScrollRef.current && topScrollRef.current) {
            tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        }
    };

    const handleTableScroll = () => {
        if (topScrollRef.current && tableScrollRef.current) {
            topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
        }
    };

    useEffect(() => {
        const tableElement = tableScrollRef.current?.querySelector('table');
        if (!tableElement) return;

        const observer = new ResizeObserver(() => {
            if (tableElement) {
                setTableWidth(tableElement.offsetWidth);
            }
        });

        observer.observe(tableElement);
        return () => observer.disconnect();
    }, [users, loading, searchQuery]);

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
                        plan: u.plan || 'CORE',
                        stripeCustomerId: u.stripeCustomerId || null,
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

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/admin" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Dashboard
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">User Directory</h1>
                        <p className="text-sm text-[var(--muted)]">Total Users: {users.length}</p>
                    </div>

                    <div className="w-full md:w-96 relative">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-2 pl-10 pr-4 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--muted)] absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col">
                    {/* Top Scrollbar Container */}
                    <div
                        ref={topScrollRef}
                        onScroll={handleTopScroll}
                        className="overflow-x-auto persistent-scrollbar border-b border-[var(--border)]"
                    >
                        {/* Dynamic width to match the table content to ensure perfectly synced overflow */}
                        <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
                    </div>

                    <div
                        ref={tableScrollRef}
                        onScroll={handleTableScroll}
                        className="overflow-x-auto persistent-scrollbar"
                    >
                        <table className="min-w-full divide-y divide-[var(--border)]" style={{ minWidth: '1100px' }}>
                            <thead className="bg-[var(--bg)]/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Name</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Email</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Role</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Plan</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Receipts</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Storage</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Activity</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-sm text-[var(--muted)] animate-pulse">Loading list...</td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-sm text-[var(--muted)]">
                                            {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            onClick={() => router.push(`/admin/users/${user.id}`)}
                                            className={`hover:bg-[var(--card-hover)] transition-colors cursor-pointer ${user.role === 'SUPER_ADMIN' ? 'border-l-2 border-l-yellow-600/50' : ''}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)]">
                                                <div className="max-w-[150px] md:max-w-[200px] truncate" title={user.name}>{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                                <div className="max-w-[180px] md:max-w-[250px] truncate" title={user.email}>{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium border uppercase tracking-wider ${user.role === 'SUPER_ADMIN' ? 'bg-yellow-500/10 text-yellow-500/90 border-yellow-500/20' :
                                                    user.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-white/5 text-[var(--muted)] border-[var(--border)]'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex w-fit items-center px-2 py-1 rounded text-[10px] font-medium border uppercase tracking-wider ${user.plan === 'PRO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        user.plan === 'Business' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-white/5 text-[var(--muted)] border-[var(--border)]'
                                                        }`}>
                                                        {user.plan}
                                                    </span>
                                                    {user.plan === 'PRO' && (
                                                        <span className="text-[10px] text-[var(--muted)]">
                                                            {user.stripeCustomerId ? 'Stripe Sub' : 'Manual/Admin'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)]">
                                                {user.receiptCount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)]">
                                                {user.storageMB.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[var(--muted)] text-xs">MB</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-[var(--muted)]">{user.lastUploadDate ? new Date(user.lastUploadDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : '—'}</div>
                                                <div className="text-[10px] text-[var(--muted)] mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteUser(user.id, user.email);
                                                    }}
                                                    className="text-red-400/80 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded border border-transparent hover:border-red-500/30 transition-colors text-xs"
                                                    title="Delete User"
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
                </div>
            </div>
        </div>
    );
}

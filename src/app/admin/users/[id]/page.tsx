"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Receipt = {
    id: string;
    receiptNumber: string | null;
    imageUrl: string | null;
    createdAt: string;
};

type User = {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    receipts: Receipt[];
};

export default function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const unwrappedParams = use(params);

    const [currentUser, setCurrentUser] = useState<{ role: string; id: string } | null>(null);

    const fetchUser = async () => {
        try {
            // Fetch target user
            const res = await fetch(`/api/admin/users/${unwrappedParams.id}`);
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else if (res.status === 401) {
                router.push('/login');
                return;
            } else {
                alert('User not found');
                router.push('/admin');
                return;
            }

            // Fetch current user (me) for permissions
            const meRes = await fetch('/api/auth/me');
            if (meRes.ok) {
                const me = await meRes.json();
                setCurrentUser(me);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [unwrappedParams.id]);

    const handleRoleUpdate = async () => {
        if (!user) return;
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            if (res.ok) {
                setUser({ ...user, role: newRole });
            } else {
                alert('Failed to update role');
            }
        } catch (error) {
            console.error('Role update failed', error);
        }
    };

    const handleDeleteUser = async () => {
        if (!user || !confirm('Are you sure you want to delete this user and ALL their data?')) return;

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                router.push('/admin');
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Delete user failed', error);
        }
    };

    const handleDeleteReceipt = async (id: string, type: 'Generated' | 'Uploaded') => {
        if (!confirm(`Are you sure you want to delete this ${type} receipt?`)) return;

        try {
            const res = await fetch(`/api/admin/receipts/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchUser(); // Refresh list
            } else {
                alert('Failed to delete receipt');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
    if (!user) return <div className="p-8 text-gray-500">User not found</div>;

    return (
        <div className="min-h-screen bg-[#0B1220] p-8">
            <div className="max-w-7xl mx-auto">
                <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
                    &larr; Back to Dashboard
                </Link>

                <h1 className="text-2xl font-bold text-gray-100 mb-8">User Details</h1>

                <div className="bg-[#1F2937] p-6 rounded-lg shadow border border-[#2D3748] mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-medium text-gray-100">Profile & Stats</h2>
                        <div className="flex space-x-3">
                            {/* Action Buttons Logic */}
                            {(() => {
                                if (!currentUser) return null;

                                const isMeSuperAdmin = currentUser.role === 'SUPER_ADMIN';
                                const isMeAdmin = currentUser.role === 'ADMIN';

                                const targetIsSuperAdmin = user.role === 'SUPER_ADMIN';
                                const targetIsAdmin = user.role === 'ADMIN';

                                // Define permissions
                                const canModifyRole = isMeSuperAdmin || (isMeAdmin && !targetIsAdmin && !targetIsSuperAdmin); // Admin can promote User, but not modify Admin/Super
                                const canDeleteUser = isMeSuperAdmin || (isMeAdmin && !targetIsAdmin && !targetIsSuperAdmin);

                                // "Admin cannot demote other Admins" -> Admin can only act on USER.
                                // "Admin: Can manage USERS only"

                                if (user.id === currentUser.id) return <span className="text-gray-500 text-sm">You cannot delete yourself</span>;

                                return (
                                    <>
                                        {canModifyRole && (
                                            <button
                                                onClick={handleRoleUpdate}
                                                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${user.role === 'ADMIN'
                                                    ? 'border-yellow-600 text-yellow-500 hover:bg-yellow-900/20'
                                                    : 'border-green-600 text-green-500 hover:bg-green-900/20'
                                                    }`}
                                            >
                                                {user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                                            </button>
                                        )}
                                        {canDeleteUser && (
                                            <button
                                                onClick={handleDeleteUser}
                                                className="px-3 py-1 text-xs font-semibold rounded-full border border-red-800 text-red-500 hover:bg-red-900/20 transition-colors"
                                            >
                                                Delete User
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-4">
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-400">Email</dt>
                            <dd className="mt-1 text-sm text-gray-100">{user.email}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-400">Role</dt>
                            <dd className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'SUPER_ADMIN' ? 'bg-yellow-600 text-black' :
                                    user.role === 'ADMIN' ? 'bg-indigo-600 text-white' :
                                        'bg-gray-600 text-white'
                                    }`}>
                                    {user.role}
                                </span>
                            </dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-400">Joined</dt>
                            <dd className="mt-1 text-sm text-gray-100">{new Date(user.createdAt).toLocaleDateString()}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-400">Total Receipts</dt>
                            <dd className="mt-1 text-2xl font-semibold text-indigo-400">{user.receipts.length}</dd>
                        </div>
                    </dl>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#2D3748] pt-6">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Generated</dt>
                            <dd className="mt-1 text-xl font-semibold text-gray-200">
                                {user.receipts.filter(r => !!r.receiptNumber).length}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Uploaded</dt>
                            <dd className="mt-1 text-xl font-semibold text-gray-200">
                                {user.receipts.filter(r => !!r.imageUrl).length}
                            </dd>
                        </div>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-100 mb-4">Receipts</h2>
                <div className="bg-[#1F2937] rounded-lg shadow overflow-x-auto border border-[#2D3748]">
                    <table className="min-w-full divide-y divide-[#2D3748]">
                        <thead className="bg-[#1F2937]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Identifier</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#1F2937] divide-y divide-[#2D3748]">
                            {user.receipts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-400">No receipts found.</td>
                                </tr>
                            ) : user.receipts.map((receipt) => {
                                const isGenerated = !!receipt.receiptNumber;
                                const typeLabel = isGenerated ? 'Generated' : 'Uploaded';
                                const identifier = isGenerated ? receipt.receiptNumber : 'View Image';
                                const link = isGenerated ? `/receipt/${receipt.id}` : receipt.imageUrl;

                                return (
                                    <tr key={receipt.id} className="hover:bg-[#243043] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                            {new Date(receipt.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isGenerated ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                            {link ? (
                                                <a href={link || '#'} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                                    {identifier}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleDeleteReceipt(receipt.id, typeLabel as any)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

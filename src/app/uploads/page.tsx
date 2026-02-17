"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadButton from '@/components/UploadButton';

type Receipt = {
    id: string;
    imageUrl: string;
    createdAt: string;
};

export default function UploadsPage() {
    const router = useRouter();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReceipts = async () => {
        try {
            const res = await fetch('/api/uploaded-receipts');
            if (res.ok) {
                const data = await res.json();
                setReceipts(data);
            } else if (res.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch receipts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceipts();
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this receipt?')) return;

        try {
            const res = await fetch(`/api/receipts/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchReceipts(); // Refresh list
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1220] text-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-gray-100">My Uploads</h2>
                    </div>
                    <div className="flex gap-3">
                        <UploadButton
                            onUploadComplete={fetchReceipts}
                            endpoint="/api/uploaded-receipts"
                        />
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-[#1F2937] rounded-xl shadow border border-[#2D3748] p-6">


                    {loading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : receipts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                            <p>No uploaded receipts found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {receipts.map((receipt) => (
                                <div key={receipt.id} className="relative group bg-[#111827] rounded-lg overflow-hidden border border-[#2D3748] shadow-sm">
                                    <div className="aspect-w-3 aspect-h-4 relative h-64">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={receipt.imageUrl}
                                            alt="Receipt"
                                            className="object-cover w-full h-full"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 bg-black bg-opacity-75 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                                        <span className="text-xs text-gray-300">
                                            {new Date(receipt.createdAt).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(receipt.id)}
                                            className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

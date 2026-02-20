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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
                                <div key={receipt.id} className="relative group bg-[#111827] rounded-lg overflow-hidden border border-[#2D3748] shadow-sm flex flex-col">
                                    <div
                                        className="aspect-w-3 aspect-h-4 relative h-64 cursor-pointer"
                                        onClick={() => setSelectedImage(receipt.imageUrl)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={receipt.imageUrl}
                                            alt="Receipt"
                                            className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="bg-[#111827] p-3 border-t border-[#2D3748] flex justify-between items-center z-10">
                                        <span className="text-xs text-gray-300">
                                            {new Date(receipt.createdAt).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(receipt.id);
                                            }}
                                            className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
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

            {/* Full-size Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 sm:p-8">
                    <div className="relative w-full h-full flex flex-col items-center justify-center max-w-5xl mx-auto">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 z-50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Ensure image maintains aspect ratio and fits within viewport */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedImage}
                            alt="Full Size Receipt"
                            className="max-h-full max-w-full object-contain rounded border border-gray-800 shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

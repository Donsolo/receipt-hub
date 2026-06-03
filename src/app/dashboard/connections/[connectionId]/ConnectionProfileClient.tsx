"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectionProfileClient({ targetUserId, connectionId }: { targetUserId: string, connectionId: string }) {
    const router = useRouter();
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleOpenMessages = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/conversations`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/dashboard/messages/${data.conversation.id}`);
            } else {
                showToast("Failed to open conversation.");
            }
        } catch (error) {
            showToast("An error occurred.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="relative">
            {toastMessage && (
                <div className="absolute -top-16 right-0 bg-[var(--card)] text-[var(--text)] px-4 py-2 rounded shadow-lg border border-[var(--border)] z-50 transition-opacity text-sm">
                    {toastMessage}
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                    onClick={handleOpenMessages}
                    disabled={actionLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {actionLoading ? 'Loading...' : 'Message'}
                </button>

                <button
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--text)] px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Manage Connection
                </button>
            </div>
        </div>
    );
}

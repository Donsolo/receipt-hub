'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectRefreshPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const refreshLink = async () => {
            try {
                const res = await fetch('/api/connect/create-account-link', {
                    method: 'POST',
                });
                const data = await res.json();
                
                if (res.ok && data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error(data.error || 'Failed to refresh setup link');
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'An error occurred. Please return to the Billing Center and try again.');
            }
        };

        refreshLink();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                </div>
                <h1 className="text-2xl font-bold mb-4">Resuming setup</h1>
                
                {error ? (
                    <>
                        <p className="text-red-400 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/dashboard/billing')}
                            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                        >
                            Return to Billing Center
                        </button>
                    </>
                ) : (
                    <p className="text-gray-400">Requesting a fresh secure link from Stripe...</p>
                )}
            </div>
        </div>
    );
}

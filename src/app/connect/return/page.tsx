'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ConnectReturnPage() {
    const router = useRouter();
    const [status, setStatus] = useState<string>('Verifying your payment setup...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 10;

        const checkStatus = async () => {
            try {
                const res = await fetch('/api/connect/status');
                if (!res.ok) throw new Error('Failed to fetch status');
                const data = await res.json();

                if (data.status === 'COMPLETE' || data.status === 'RESTRICTED') {
                    router.push('/dashboard/billing');
                } else {
                    if (attempts >= maxAttempts) {
                        setStatus('Verification is taking longer than expected. You can safely close this page and check your status in the Billing Center later.');
                    } else {
                        attempts++;
                        setTimeout(checkStatus, 3000); // Poll every 3 seconds
                    }
                }
            } catch (err) {
                console.error(err);
                setError('We encountered an error verifying your status. Please check your Billing Center.');
            }
        };

        checkStatus();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold mb-4">Setting up payments</h1>
                
                {error ? (
                    <p className="text-red-400">{error}</p>
                ) : (
                    <p className="text-gray-400">{status}</p>
                )}

                {(error || status.includes('taking longer')) && (
                    <button
                        onClick={() => router.push('/dashboard/billing')}
                        className="mt-6 w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                    >
                        Go to Billing Center
                    </button>
                )}
            </div>
        </div>
    );
}

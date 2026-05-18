"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams?.get('session_id');
    const [statusData, setStatusData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [pollAttempts, setPollAttempts] = useState(0);

    useEffect(() => {
        if (!sessionId) return;

        let pollInterval: NodeJS.Timeout;
        let attempts = 0;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/public/payment/session/${sessionId}`);
                const data = await res.json();
                
                if (!res.ok || !data.success) {
                    setError(data.error || 'Failed to verify payment status.');
                    return;
                }

                setStatusData(data);

                // Stop polling if the webhook successfully fully processed it
                if (data.status === 'SUCCEEDED' || data.status === 'FAILED') {
                    if (pollInterval) clearInterval(pollInterval);
                } else {
                    attempts += 1;
                    setPollAttempts(attempts);
                    if (attempts >= 10) {
                        if (pollInterval) clearInterval(pollInterval);
                    }
                }
            } catch (err: any) {
                setError('Error connecting to verification server.');
            }
        };

        checkStatus(); // Initial check
        pollInterval = setInterval(checkStatus, 3000); // Poll every 3 seconds

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [sessionId]);

    if (error) {
        return (
            <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 ring-1 ring-red-500/20">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h1 className="text-2xl font-black text-[var(--text)] mb-3">Verification Error</h1>
                <p className="text-[var(--muted)] mb-8">{error}</p>
            </div>
        );
    }

    if (!statusData || statusData.status === 'PROCESSING') {
        if (pollAttempts >= 10) {
            return (
                <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h1 className="text-2xl font-black text-[var(--text)] mb-3">Processing Payment...</h1>
                    <p className="text-[var(--muted)] mb-8">Your payment has been received, but we're still finalizing your receipt in the background. You can safely leave this page.</p>
                    <Link href="/" className="px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl transition-all">Return Home</Link>
                </div>
            );
        }

        return (
            <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-6"></div>
                <h1 className="text-2xl font-black text-[var(--text)] mb-3">Verifying Payment...</h1>
                <p className="text-[var(--muted)] mb-8">Please wait while we confirm your payment with Stripe.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-bottom-8 fade-in duration-700">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-inner ring-1 ring-emerald-500/20">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h1 className="text-3xl font-black text-[var(--text)] mb-3 tracking-tight">Payment Successful</h1>
            <p className="text-base text-[var(--muted)] mb-4 leading-relaxed">
                Thank you! Your secure payment to <span className="font-bold">{statusData.businessName || 'the issuer'}</span> was successfully processed.
            </p>
            <div className="bg-white dark:bg-[#1a2332] p-4 rounded-2xl w-full mb-8 shadow-sm ring-1 ring-black/5 dark:ring-white/5 flex flex-col items-center justify-center">
                <span className="text-sm text-[var(--muted)]">Amount Paid</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${(statusData.amount || 0).toFixed(2)}
                </span>
            </div>
            
            <div className="flex flex-col w-full gap-3">
                <Link 
                    href={`/invoice/${statusData.invoiceToken}`} 
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5"
                >
                    Return to Invoice
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>
                {statusData.convertedReceiptId && (
                    <p className="text-sm text-[var(--muted)] mt-2">
                        A receipt has been generated and securely stored. You can request a copy from the issuer.
                    </p>
                )}
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50/50 dark:bg-[#0b1220] py-12">
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
            }>
                <SuccessContent />
            </Suspense>
        </div>
    );
}

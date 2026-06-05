"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import ReceiptForm from "./ReceiptForm";
import Link from "next/link";

export default function CreateReceiptPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [nextReceiptNumber, setNextReceiptNumber] = useState<string>("RCPT-XXXX");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const headers = await getAuthHeader();
                
                // Fetch User
                const userRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { ...headers as any, 'Content-Type': 'application/json' }
                });

                if (userRes.status === 401) {
                    router.push('/login');
                    return;
                }

                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData);
                }

                // Fetch Next Receipt Number
                const numRes = await fetch(`${API_BASE_URL}/api/receipts/next-number`, {
                    headers: { ...headers as any, 'Content-Type': 'application/json' }
                });

                if (numRes.ok) {
                    const numData = await numRes.json();
                    if (numData.success) {
                        setNextReceiptNumber(numData.nextReceiptNumber);
                    }
                }

            } catch (err) {
                console.error("Failed to load receipt creation data", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg)] min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link href="/history" className="inline-flex items-center text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-4 border border-[var(--border)]/50 hover:bg-[var(--card-hover)] rounded-md px-3 py-1.5 w-fit">
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Receipts
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                        New Receipt
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        Create and save a receipt
                    </p>
                </div>

                <ReceiptForm initialData={{ receiptNumber: nextReceiptNumber, date: new Date(), taxType: 'none', items: [] }} user={user || undefined} />
            </div>
        </div>
    );
}

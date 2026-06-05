"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import ReportsClient from './ReportsClient';
import HeroSection from '@/components/ui/HeroSection';

export default function ReportsPage() {
    const router = useRouter();
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const headers = await getAuthHeader();
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { ...headers as any, 'Content-Type': 'application/json' }
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }

                if (res.ok) {
                    const user = await res.json();
                    const userIsPro = (user.plan === "PRO" && user.planStatus !== "inactive") || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
                    setIsPro(userIsPro);
                }
            } catch (err) {
                console.error("Failed to load user for reports", err);
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
        <div className="min-h-screen bg-[var(--bg)] flex flex-col">
            <HeroSection pageKey="reports" />
            <div className="p-4 sm:p-8 flex-1">
                <ReportsClient isPro={isPro} />
            </div>
        </div>
    );
}

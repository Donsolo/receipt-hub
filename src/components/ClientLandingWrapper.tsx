"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ClientLandingWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        console.log('[LANDING] isLoading:', isLoading, 'user:', user ? 'EXISTS' : 'NULL');
        if (!isLoading && user !== null) {
            console.log('[LANDING] Redirecting to dashboard because user exists');
            router.replace('/dashboard');
        }
    }, [isLoading, user, router]);

    // Show nothing while loading to prevent flash
    if (isLoading) return null;
    // Show nothing if authenticated (redirect is in progress)
    if (user !== null) return null;

    // Only render landing page content when confirmed logged out
    return <>{children}</>;
}

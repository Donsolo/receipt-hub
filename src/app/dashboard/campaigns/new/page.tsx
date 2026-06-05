"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import NewCampaignClient from './NewCampaignClient';

export default function NewCampaignPage() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const headers = await getAuthHeader();
                const res = await fetch(`${API_BASE_URL}/api/contacts/dashboard`, {
                    headers: { ...headers as any, 'Content-Type': 'application/json' }
                });

                if (res.status === 401) {
                    router.push('/login');
                    return;
                }

                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        if (!json.isPro) {
                            router.push('/dashboard/campaigns');
                            return;
                        }
                        setData(json);
                    }
                }
            } catch (err) {
                console.error("Failed to load new campaign data", err);
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

    if (!data) return <div className="p-8 text-center text-[var(--muted)]">Failed to load data</div>;

    return <NewCampaignClient contacts={data.contacts} tags={data.tags} />;
}

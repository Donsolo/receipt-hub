"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CampaignDetailClient from './CampaignDetailClient';

export default function CampaignDetailPage() {
    const params = useParams<{ id: string }>();
    const [campaign, setCampaign] = useState<any>(null);

    useEffect(() => {
        if (!params.id) return;
        // TODO Phase 4: replace with fetch(`${API_BASE_URL}/api/...`)
        (async () => fetch(`${API_BASE_URL}/api/PLACEHOLDER/${params.id}`, { headers: { ...((await getAuthHeader()) as any) } }))()
            .then(r => r.json())
            .then(setCampaign)
            .catch(err => console.error(err));
    }, [params.id]);

    if (!campaign) return <div className="p-8 text-[var(--muted)]">Loading campaign...</div>;

    return <CampaignDetailClient campaign={campaign} />;
}

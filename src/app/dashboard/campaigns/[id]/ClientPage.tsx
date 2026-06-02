'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CampaignDetailClient from './CampaignDetailClient';

export default function CampaignDetailPage() {
    const params = useParams<{ id: string }>();
    const [campaign, setCampaign] = useState<any>(null);

    useEffect(() => {
        if (!params.id) return;
        // TODO Phase 4: replace with fetch(`${API_BASE_URL}/api/...`)
        fetch(`/api/PLACEHOLDER/${params.id}`)
            .then(r => r.json())
            .then(setCampaign)
            .catch(err => console.error(err));
    }, [params.id]);

    if (!campaign) return <div className="p-8 text-[var(--muted)]">Loading campaign...</div>;

    return <CampaignDetailClient campaign={campaign} />;
}

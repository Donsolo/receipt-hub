import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PublicInvoiceViewer from '@/components/invoices/PublicInvoiceViewer';

export default function PublicInvoicePage() {
    const params = useParams<{ token: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        // TODO Phase 4: replace with fetch(`${API_BASE_URL}/api/...`)
        (async () => fetch(`${API_BASE_URL}/api/PLACEHOLDER/auth-status`, { headers: { ...((await getAuthHeader()) as any) } }))()
            .then(r => r.json())
            .then(data => setIsAuthenticated(data.isAuthenticated))
            .catch(err => console.error(err));
    }, []);

    if (!params.token) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-[#f3f4f6] dark:bg-[var(--bg)] font-sans flex flex-col selection:bg-blue-500/30">
            <PublicInvoiceViewer token={params.token} isAuthenticated={isAuthenticated} />
        </div>
    );
}

"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PublicInvoiceViewer from '@/components/invoices/PublicInvoiceViewer';

export default function PublicInvoicePage() {
    const params = useParams<{ token: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        (async () => fetch(`${API_BASE_URL}/api/auth/me`, { headers: { ...((await getAuthHeader()) as any) } }))()
            .then(r => r.json())
            .then(data => setIsAuthenticated(!data.error))
            .catch(err => console.error(err));
    }, []);

    if (!params.token) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-[#f3f4f6] dark:bg-[var(--bg)] font-sans flex flex-col selection:bg-blue-500/30">
            <PublicInvoiceViewer token={params.token} isAuthenticated={isAuthenticated} />
        </div>
    );
}

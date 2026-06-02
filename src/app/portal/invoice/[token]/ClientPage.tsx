'use client';
import { useParams, useSearchParams } from 'next/navigation';
import CustomerPortalViewer from '@/components/invoices/CustomerPortalViewer';

export default function CustomerPortalPage() {
    const params = useParams<{ token: string }>();
    const searchParams = useSearchParams();

    if (!params.token) return <div>Loading...</div>;

    const src = searchParams.get('src') || undefined;
    const rid = searchParams.get('rid') || undefined;

    return (
        <CustomerPortalViewer 
            token={params.token} 
            source={src} 
            requestLogId={rid} 
        />
    );
}

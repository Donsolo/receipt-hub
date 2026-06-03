"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import InvoiceWizard from '@/components/invoices/InvoiceWizard';
import InvoiceActivityLog from '@/components/invoices/InvoiceActivityLog';
import PaymentPlanManager from '@/components/invoices/PaymentPlanManager';
import PaymentInsightsCard from '@/components/invoices/PaymentInsightsCard';

export default function EditInvoicePage() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!params.id) return;
        // TODO Phase 4: replace with fetch(`${API_BASE_URL}/api/...`)
        (async () => fetch(`${API_BASE_URL}/api/PLACEHOLDER/${params.id}`, { headers: { ...((await getAuthHeader()) as any) } }))()
            .then(r => r.json())
            .then(setData)
            .catch(err => console.error(err));
    }, [params.id]);

    if (!data) return <div className="p-8 text-[var(--muted)]">Loading...</div>;

    // // TODO: server logic moved to /api route in Phase 4
    return (
        <div className="min-h-screen bg-[var(--bg)] pt-8 pb-32">
            <InvoiceWizard 
                isPro={data.isPro} 
                businessName={data.businessName}
                businessLogoPath={data.businessLogoPath}
                businessRegistrationNumber={data.businessRegistrationNumber}
                initialData={data.initialData} 
            />

            <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
                {data.isPro && (
                    <div className="mb-8">
                        <PaymentInsightsCard invoiceId={data.initialData.id} />
                    </div>
                )}
                
                {data.isPro && (
                    <PaymentPlanManager 
                        invoiceId={data.initialData.id}
                        invoiceTotal={data.initialData.total}
                        initialPlanEnabled={data.initialPlanEnabled}
                        initialInstallments={data.initialInstallments}
                    />
                )}
                
                {/* Payment Request Activity Section */}
                {data.isPro && <InvoiceActivityLog invoiceId={data.initialData.id} />}
            </div>
        </div>
    );
}

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
        (async () => {
            try {
                const headers = { ...((await getAuthHeader()) as any) };
                
                const [invoiceRes, metaRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/invoices/${params.id}`, { headers }),
                    fetch(`${API_BASE_URL}/api/invoices/create/metadata`, { headers })
                ]);
                
                const invoiceData = await invoiceRes.json();
                const metaData = await metaRes.json();
                
                if (!invoiceData.success) {
                    console.error("Failed to load invoice");
                    return;
                }

                const invoice = invoiceData.invoice;
                const userRecord = metaData.userRecord;
                const globalProfile = metaData.globalProfile;

                const initialData = {
                    id: invoice.id,
                    clientName: invoice.clientName,
                    clientEmail: invoice.clientEmail || '',
                    clientCompany: invoice.clientCompany || '',
                    clientPhone: invoice.clientPhone || '',
                    clientAddress: invoice.clientAddress || '',
                    clientPropertyAddress: invoice.clientPropertyAddress || '',
                    title: invoice.title,
                    description: invoice.description || '',
                    issueDate: new Date(invoice.issueDate).toISOString(),
                    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : '',
                    notes: invoice.notes || '',
                    attachedPhotos: invoice.attachedPhotos ? (invoice.attachedPhotos as string[]) : undefined,
                    tax: invoice.tax || 0,
                    depositAmount: invoice.depositAmount || 0,
                    paymentMethod: invoice.paymentMethod || '',
                    payments: invoice.payments ? (invoice.payments as any) : undefined,
                    discountType: invoice.discountType || "none",
                    discountValue: invoice.discountValue || 0,
                    miscTitle: invoice.miscTitle,
                    miscTaxValue: invoice.miscTaxValue,
                    miscDiscountType: invoice.miscDiscountType,
                    miscDiscountValue: invoice.miscDiscountValue,
                    status: invoice.status,
                    acceptOnlinePayment: invoice.acceptOnlinePayment,
                    total: invoice.total,
                    items: invoice.items ? invoice.items.map((i: any) => ({
                        id: i.id,
                        name: i.name,
                        description: i.description || '',
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        type: i.type
                    })) : []
                };

                setData({
                    isPro: metaData.isPro,
                    businessName: userRecord?.businessName || userRecord?.email?.split('@')[0] || globalProfile?.businessName || undefined,
                    businessLogoPath: userRecord?.businessLogoPath || globalProfile?.logoPath || undefined,
                    businessRegistrationNumber: userRecord?.businessRegistrationNumber || globalProfile?.businessRegistrationNumber || undefined,
                    connectOnboardingStatus: userRecord?.connectOnboardingStatus || 'NOT_STARTED',
                    initialData,
                    initialPlanEnabled: invoice.paymentPlanEnabled,
                    initialInstallments: invoice.installments ? invoice.installments.map((i: any) => ({
                        id: i.id,
                        label: i.label,
                        amount: i.amount,
                        dueDate: i.dueDate ? new Date(i.dueDate).toISOString() : null,
                        status: i.status
                    })) : []
                });

            } catch (err) {
                console.error(err);
            }
        })();
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
                connectOnboardingStatus={data.connectOnboardingStatus}
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

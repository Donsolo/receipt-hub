import InvoiceWizard from '@/components/invoices/InvoiceWizard';
import InvoiceActivityLog from '@/components/invoices/InvoiceActivityLog';
import PaymentPlanManager from '@/components/invoices/PaymentPlanManager';
import PaymentInsightsCard from '@/components/invoices/PaymentInsightsCard';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        redirect('/login');
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";
    
    if (!isPro) {
        redirect('/dashboard/invoices');
    }

    const invoice = await db.invoice.findUnique({
        where: { id },
        include: { 
            items: true,
            installments: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!invoice || invoice.userId !== authUser.userId || invoice.isConverted) {
        redirect('/dashboard/invoices');
    }

    // Adapt to wizard props
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
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : '',
        notes: invoice.notes || '',
        attachedPhotos: invoice.attachedPhotos ? (invoice.attachedPhotos as string[]) : undefined,
        tax: invoice.tax || 0,
        depositAmount: invoice.depositAmount || 0,
        paymentMethod: invoice.paymentMethod || '',
        payments: invoice.payments ? (invoice.payments as any) : undefined,
        discountType: invoice.discountType || "none",
        discountValue: invoice.discountValue || 0,
        status: invoice.status,
        items: invoice.items.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice
        }))
    };

    const userRecord = await db.user.findUnique({
        where: { id: authUser.userId },
        select: { businessName: true, businessLogoPath: true, businessRegistrationNumber: true, email: true }
    });

    const globalProfile = await db.businessProfile.findFirst();

    return (
        <div className="min-h-screen bg-[var(--bg)] pt-8 pb-32">
            <InvoiceWizard 
                isPro={isPro} 
                businessName={userRecord?.businessName || userRecord?.email?.split('@')[0] || globalProfile?.businessName || undefined}
                businessLogoPath={userRecord?.businessLogoPath || globalProfile?.logoPath || undefined}
                businessRegistrationNumber={userRecord?.businessRegistrationNumber || globalProfile?.businessRegistrationNumber || undefined}
                initialData={initialData} 
            />

            <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
                {isPro && (
                    <div className="mb-8">
                        <PaymentInsightsCard invoiceId={invoice.id} />
                    </div>
                )}
                
                {isPro && (
                    <PaymentPlanManager 
                        invoiceId={invoice.id}
                        invoiceTotal={invoice.total}
                        initialPlanEnabled={invoice.paymentPlanEnabled}
                        initialInstallments={invoice.installments.map(i => ({
                            id: i.id,
                            label: i.label,
                            amount: i.amount,
                            dueDate: i.dueDate ? i.dueDate.toISOString() : null,
                            status: i.status
                        }))}
                    />
                )}
                
                {/* Payment Request Activity Section */}
                {isPro && <InvoiceActivityLog invoiceId={invoice.id} />}
            </div>
        </div>
    );
}

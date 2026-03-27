import InvoiceWizard from '@/components/invoices/InvoiceWizard';
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
        include: { items: true }
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
        tax: invoice.tax || 0,
        status: invoice.status,
        items: invoice.items.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice
        }))
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] pt-8 pb-32">
            <InvoiceWizard isPro={isPro} initialData={initialData} />
        </div>
    );
}

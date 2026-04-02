import InvoiceWizard from '@/components/invoices/InvoiceWizard';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage() {
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
            />
        </div>
    );
}

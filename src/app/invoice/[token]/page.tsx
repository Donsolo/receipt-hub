import PublicInvoiceViewer from '@/components/invoices/PublicInvoiceViewer';
import { cookies } from 'next/headers';

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const cookieStore = await cookies();
    const isAuthenticated = !!cookieStore.get('auth_token')?.value;

    return (
        <div className="min-h-screen bg-[#f3f4f6] dark:bg-[var(--bg)] font-sans flex flex-col selection:bg-blue-500/30">
            <PublicInvoiceViewer token={token} isAuthenticated={isAuthenticated} />
        </div>
    );
}

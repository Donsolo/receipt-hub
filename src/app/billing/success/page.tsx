import Link from 'next/link';

export default async function BillingSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>;
}) {
    // The session_id is available in searchParams if we need to verify it server-side,
    // but the webhook is the source of truth for DB updates.
    
    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-xl">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                
                <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Payment received — Pro is activating</h1>
                <p className="text-[var(--muted)] mb-8">
                    Your account is being upgraded. It may take a few moments for the new features to become available.
                </p>

                <div className="flex flex-col space-y-3">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors w-full"
                    >
                        Go to Dashboard
                    </Link>
                    <Link
                        href="/billing"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--text)] transition-colors w-full"
                    >
                        Go to Billing
                    </Link>
                </div>
            </div>
        </div>
    );
}

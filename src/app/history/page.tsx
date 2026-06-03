import { getReceipts } from "@/lib/actions";
import HistoryClient from '@/components/HistoryClient';
import { Suspense } from 'react';

// export const dynamic stripped by mobile build

export default async function HistoryPage(props: {
    searchParams: Promise<{ query?: string }>;
}) {
    const searchParams = process.env.NEXT_MOBILE_BUILD === 'true' ? {} : await props.searchParams;
    const searchQuery = (searchParams as any)?.query || "";
    const receipts = process.env.NEXT_MOBILE_BUILD === 'true' ? [] : await getReceipts(searchQuery);

    return (
        <div className="min-h-screen bg-[var(--bg)] font-sans overflow-x-hidden pb-24">
            <Suspense fallback={<div>Loading history...</div>}>
                <HistoryClient initialReceipts={receipts} />
            </Suspense>
        </div>
    );
}

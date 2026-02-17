import { getReceipts } from "@/lib/actions";
import Link from 'next/link';
import HistoryClient from '@/components/HistoryClient';

export const dynamic = "force-dynamic";

export default async function HistoryPage(props: {
    searchParams: Promise<{ query?: string }>;
}) {
    const searchParams = await props.searchParams;
    const searchQuery = searchParams?.query || "";
    // getReceipts now securely fetches ALL receipts for the user
    const receipts = await getReceipts(searchQuery);

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-[var(--text-primary)] sm:text-3xl sm:truncate">
                        Receipt History
                    </h2>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                    <Link
                        href="/uploads"
                        className="inline-flex items-center px-4 py-2 border border-[#2D3748] rounded-md shadow-sm text-sm font-medium text-gray-100 bg-[#1F2937] hover:bg-[#243043]"
                    >
                        Upload Receipt
                    </Link>
                    <Link
                        href="/create"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Create Receipt
                    </Link>
                </div>
            </div>

            <div className="bg-[#111827] rounded-2xl shadow-sm border border-[#2D3748] overflow-hidden">
                <HistoryClient initialReceipts={receipts} />
            </div>
        </div>
    );
}

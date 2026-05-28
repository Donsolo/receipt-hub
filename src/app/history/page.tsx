import { getReceipts } from "@/lib/actions";
import HistoryClient from '@/components/HistoryClient';

export const dynamic = "force-dynamic";

export default async function HistoryPage(props: {
    searchParams: Promise<{ query?: string }>;
}) {
    const searchParams = await props.searchParams;
    const searchQuery = searchParams?.query || "";
    const receipts = await getReceipts(searchQuery);

    return (
        <div className="min-h-screen bg-[#F4F5F9] font-sans overflow-x-hidden pb-24">
            <HistoryClient initialReceipts={receipts} />
        </div>
    );
}

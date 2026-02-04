import { getReceipts } from "@/lib/actions";
import Search from "@/components/Search";
import Link from 'next/link';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export const dynamic = "force-dynamic";

export default async function HistoryPage(props: {
    searchParams: Promise<{ query?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.query || "";
    const receipts = await getReceipts(query);

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Receipt History
                    </h2>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <Link
                        href="/create"
                        className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        New Receipt
                    </Link>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <Search placeholder="Search receipts..." />
            </div>

            <div className="bg-white/50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <ul className="divide-y divide-gray-100">
                    {receipts.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-400 text-sm">No receipts found.</li>
                    ) : (
                        receipts.map((receipt) => (
                            <li key={receipt.id}>
                                <Link href={`/receipt/${receipt.id}`} className="block hover:bg-gray-50 transition-colors duration-150">
                                    <div className="px-6 py-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {receipt.receiptNumber}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {receipt.clientName || 'Guest Client'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {Number(receipt.total).toFixed(2)}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-400">
                                                    <time dateTime={receipt.date.toISOString()}>{format(receipt.date, 'MMM d, yyyy')}</time>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

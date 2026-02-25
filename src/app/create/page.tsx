import { getNextReceiptNumber } from "@/lib/actions";
import ReceiptForm from "./ReceiptForm";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function CreateReceiptPage() {
    const nextReceiptNumber = await getNextReceiptNumber();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    return (
        <div className="bg-[#0B1220] min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link href="/history" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors mb-4 border border-gray-700/50 hover:bg-white/5 rounded-md px-3 py-1.5 w-fit">
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Receipts
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                        New Receipt
                    </h2>
                    <p className="mt-1 text-sm text-white/50">
                        Create and save a receipt
                    </p>
                </div>

                <ReceiptForm initialData={{ receiptNumber: nextReceiptNumber, date: new Date(), taxType: 'none', items: [] }} user={authUser || undefined} />
            </div>
        </div>
    );
}

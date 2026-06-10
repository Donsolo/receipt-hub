"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from "next/link";
import { format } from "date-fns";
import PrintButton from "@/components/PrintButton";
import FinalizeButton from "@/components/FinalizeButton";
import DuplicateButton from "@/components/DuplicateButton";
import { CheckCircleIcon, DocumentTextIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

function getInitials(name: string) {
    if (!name) return "?";
    const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
    if (!clean) return "?";
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ReceiptViewPage() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!params.id) return;
        (async () => fetch(`${API_BASE_URL}/api/receipts/${params.id}`, { headers: { ...((await getAuthHeader()) as any) } }))()
            .then(r => r.json())
            .then(data => setData({ receipt: data.initialData, business: data.business || {} }))
            .catch(err => console.error(err));
    }, [params.id]);

    if (!data) return <div className="p-8 text-[var(--muted)]">Loading...</div>;

    const receipt = data.receipt;
    const business = data.business;
    
    const businessName = receipt.user?.businessName || receipt.user?.email?.split('@')[0] || business.businessName || "Unknown Business";
    const businessLogo = (receipt.user as any)?.businessLogoPath || business.logoPath;
    const businessEmail = receipt.user?.email || business.businessEmail;
    const businessAddress = receipt.user?.businessAddress || business.businessAddress;
    const taxId = receipt.user?.businessRegistrationNumber || business.businessRegistrationNumber;

    return (
        <div className="max-w-3xl mx-auto my-8 px-4 sm:px-6">
            {/* Actions Bar (Hidden on Print) */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <Link
                    href="/history"
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                >
                    &larr; Back to History
                </Link>
                <div className="flex flex-wrap gap-2 items-center">
                    {receipt.isFinalized ? (
                        <>
                            <DuplicateButton receiptId={receipt.id} />
                            <PrintButton />
                            <a
                                href={`/api/pdf/${receipt.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Download PDF
                            </a>
                        </>
                    ) : (
                        <>
                            <Link
                                href={`/receipt/${receipt.id}/edit`}
                                className="inline-flex items-center px-5 py-2 border border-indigo-200 shadow-sm text-sm font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                            >
                                Edit Receipt
                            </Link>
                            <FinalizeButton 
                                receiptId={receipt.id} 
                                className="inline-flex items-center px-5 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Receipt Paper */}
            <div className="bg-white dark:bg-[#121212] shadow-xl shadow-black/5 dark:shadow-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden print:shadow-none print:border-none print:p-0">
                
                <div className="p-6 sm:p-12 print:p-0">
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                {businessLogo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{getInitials(businessName)}</span>
                                )}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                    {businessName}
                                </h1>
                                {businessEmail && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {businessEmail}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 pl-4">
                            {receipt.isFinalized ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold tracking-wide">Paid</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                    <DocumentTextIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold tracking-wide">Draft</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Receipt Meta Row */}
                    <div className="grid grid-cols-2 py-4 border-y border-gray-100 dark:border-gray-800 mb-8">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Receipt</div>
                            <div className="text-base font-mono text-gray-900 dark:text-gray-200 font-medium">#{receipt.receiptNumber}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Date {receipt.isFinalized ? 'Paid' : 'Issued'}</div>
                            <div className="text-base text-gray-900 dark:text-gray-200 font-medium">{format(new Date(receipt.date), "MMM d, yyyy")}</div>
                        </div>
                    </div>

                    {/* Billed To Section */}
                    <div className="mb-10">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Billed To</h3>
                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {receipt.clientName || "Guest Client"}
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mb-8">
                        <div className="grid grid-cols-12 gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="col-span-9 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Item</div>
                            <div className="col-span-3 text-right text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Amount</div>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {receipt.items?.map((item: any) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 py-4 items-center">
                                    <div className="col-span-9 pr-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.description}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {item.quantity} &times; ${Number(item.unitPrice).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">${Number(item.lineTotal).toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-12">
                        <div className="w-full sm:w-64 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium tabular-nums">${Number(receipt.subtotal).toFixed(2)}</span>
                            </div>
                            
                            {receipt.discountType && receipt.discountType !== 'none' && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-500/90 dark:text-red-400">
                                        Discount {receipt.discountType === 'percent' ? `(${Number(receipt.discountValue)}%)` : ''}
                                    </span>
                                    <span className="text-red-500/90 dark:text-red-400 font-medium tabular-nums">
                                        -${Number(receipt.discountType === 'percent' ? receipt.subtotal * (receipt.discountValue / 100) : receipt.discountValue).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {receipt.taxType !== 'none' && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Tax {receipt.taxType === 'percent' ? `(${Number(receipt.taxValue)}%)` : ''}
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300 font-medium tabular-nums">
                                        ${Number(
                                            receipt.taxType === 'percent' 
                                                ? Math.max(0, receipt.subtotal - (receipt.discountType === 'percent' ? receipt.subtotal * (receipt.discountValue / 100) : (receipt.discountType === 'flat' ? receipt.discountValue : 0))) * (receipt.taxValue / 100)
                                                : receipt.taxValue
                                        ).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-2 flex justify-between items-center">
                                <span className="text-base font-bold text-gray-900 dark:text-white">
                                    Total {receipt.isFinalized ? 'paid' : ''}
                                </span>
                                <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">
                                    ${Number(receipt.total).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Trust Strip */}
                    {receipt.isFinalized && (
                        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 print:border-gray-300 print:bg-white mb-8">
                            <CheckBadgeIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                            <span className="text-xs font-medium tracking-wide">Issued and verified via Verihub</span>
                        </div>
                    )}

                    {/* Original Receipt Image */}
                    {receipt.imageUrl && (
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 print:hidden">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Original Scan</h4>
                            <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm group bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[160px]">
                                <a href={receipt.imageUrl} target="_blank" rel="noreferrer" className="block relative w-full h-full cursor-zoom-in">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={receipt.imageUrl} alt="Original Receipt" className="w-full h-auto max-h-[400px] object-contain mx-auto group-hover:opacity-90 transition-opacity" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg flex items-center gap-2">
                                            View Full Scan
                                        </span>
                                    </div>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {receipt.notes && (
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Notes</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{receipt.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-[#18181b] border-t border-gray-200 dark:border-gray-800 p-6 text-center print:bg-white print:border-t-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-1">{businessName}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {businessAddress && <span>{businessAddress}</span>}
                        {businessAddress && taxId && <span className="hidden sm:inline">&bull;</span>}
                        {taxId && <span>Tax ID: {taxId}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { getReceipt, getBusinessProfile } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import PrintButton from "@/components/PrintButton"; // Moved to components
import FinalizeButton from "@/components/FinalizeButton";
import DuplicateButton from "@/components/DuplicateButton";

// Force dynamic to avoid build-time DB access
export const dynamic = "force-dynamic";

export default async function ReceiptViewPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const rawReceipt = await getReceipt(params.id);
    const receipt: any = rawReceipt;
    const business = await getBusinessProfile();

    if (!receipt) {
        notFound();
    }

    // Calculate tax if needed for display (though stored in total)
    // We can just use the values from DB.

    return (
        <div className="max-w-4xl mx-auto my-8">
            {/* Actions Bar (Hidden on Print) */}
            <div className="mb-6 flex justify-between items-center print:hidden">
                <Link
                    href="/history"
                    className="text-sm font-medium text-[var(--muted)] hover:text-gray-900 transition-colors"
                >
                    &larr; History
                </Link>
                <div className="flex space-x-3 items-center">
                    {receipt.isFinalized ? (
                        <>
                            <div className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg border border-gray-200">
                                Finalized {receipt.finalizedAt ? format(new Date(receipt.finalizedAt), 'MMM d, yyyy') : ''}
                            </div>
                            <DuplicateButton receiptId={receipt.id} />
                        </>
                    ) : (
                        <>
                            <Link
                                href={`/receipt/${receipt.id}/edit`}
                                className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                Edit
                            </Link>
                            <FinalizeButton receiptId={receipt.id} />
                        </>
                    )}
                    <PrintButton />
                    <a
                        href={`/api/pdf/${receipt.id}`}
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-[var(--text)] bg-[var(--bg)] hover:bg-[var(--card)] transition-colors"
                    >
                        Download PDF
                    </a>
                </div>
            </div>

            {/* Receipt Paper */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-12 print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b border-gray-200 pb-8">
                    <div className="flex items-start">
                        {((receipt.user as any)?.businessLogoPath || business.logoPath) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={(receipt.user as any)?.businessLogoPath || business.logoPath} alt="Logo" className="h-12 w-auto object-contain mr-4" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                {receipt.user?.businessName || receipt.user?.email?.split('@')[0] || business.businessName}
                            </h1>
                            {(receipt.user?.businessRegistrationNumber || business.businessRegistrationNumber) && (
                                <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">
                                    Reg/EIN no: {receipt.user?.businessRegistrationNumber || business.businessRegistrationNumber}
                                </p>
                            )}
                            {(receipt.user?.businessAddress || business.businessAddress) && (
                                <p className="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap leading-relaxed">{receipt.user?.businessAddress || business.businessAddress}</p>
                            )}
                            {(receipt.user?.businessPhone || business.businessPhone) && <p className="mt-1 text-sm text-[var(--muted)]">{receipt.user?.businessPhone || business.businessPhone}</p>}
                        </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                        <div className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Receipt</div>
                        <div className="text-base sm:text-lg font-mono text-gray-900 whitespace-nowrap">#{receipt.receiptNumber}</div>
                        <div className="text-sm text-[var(--muted)] mt-1 whitespace-nowrap">{format(receipt.date, "MMMM d, yyyy")}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-12">
                    <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Bill To</h3>
                    <div className="text-lg text-gray-900 border-l-4 border-gray-100 pl-4">
                        {receipt.clientName || "Guest Client"}
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-12">
                    <div className="grid grid-cols-4 sm:grid-cols-12 gap-2 pb-3 border-b border-gray-200 items-center">
                        <div className="col-span-2 sm:col-span-5 text-left text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Item</div>
                        <div className="col-span-1 sm:col-span-2 text-center text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Qty</div>
                        <div className="col-span-1 sm:col-span-3 lg:col-span-2 text-right text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Price</div>
                        <div className="hidden sm:block col-span-2 text-right text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Total</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {receipt.items.map((item: any) => (
                            <div key={item.id} className="grid grid-cols-4 sm:grid-cols-12 gap-2 items-center py-3">
                                <div className="col-span-2 sm:col-span-5 text-sm text-gray-900 font-medium pr-2 truncate">{item.description}</div>
                                <div className="col-span-1 sm:col-span-2 text-center text-sm text-[var(--muted)] tabular-nums">{item.quantity}</div>
                                <div className="col-span-1 sm:col-span-3 lg:col-span-2 text-right text-sm text-[var(--muted)] tabular-nums">{Number(item.unitPrice).toFixed(2)}</div>
                                <div className="hidden sm:block col-span-2 text-right text-sm text-gray-900 font-semibold tabular-nums">{Number(item.lineTotal).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end mt-8">
                    <div className="w-full sm:w-1/2 md:w-1/3 space-y-4">
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-[var(--muted)]">Subtotal</span>
                            <span className="text-gray-900 font-medium tabular-nums">{Number(receipt.subtotal).toFixed(2)}</span>
                        </div>
                        {receipt.discountType && receipt.discountType !== 'none' && (
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-red-500 font-medium tracking-tight">
                                    Discount {receipt.discountType === 'percent' ? `(${Number(receipt.discountValue)}%)` : ''}
                                </span>
                                <span className="text-red-500 font-medium tabular-nums">
                                    -{Number(receipt.discountType === 'percent' ? receipt.subtotal * (receipt.discountValue / 100) : receipt.discountValue).toFixed(2)}
                                </span>
                            </div>
                        )}
                        {receipt.taxType !== 'none' && (
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-[var(--muted)]">
                                    Tax {receipt.taxType === 'percent' ? `(${Number(receipt.taxValue)}%)` : ''}
                                </span>
                                <span className="text-gray-900 font-medium tabular-nums">
                                    {/* Compute exact tax value directly from stored metrics to prevent backward calculation issues */}
                                    {Number(
                                        receipt.taxType === 'percent' 
                                            ? Math.max(0, receipt.subtotal - (receipt.discountType === 'percent' ? receipt.subtotal * (receipt.discountValue / 100) : (receipt.discountType === 'flat' ? receipt.discountValue : 0))) * (receipt.taxValue / 100)
                                            : receipt.taxValue
                                    ).toFixed(2)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between pt-4 pb-2 border-t-2 border-gray-900 mt-4 items-baseline">
                            <span className="text-lg font-bold text-gray-900 tracking-tight">Total</span>
                            <span className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">${Number(receipt.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {receipt.notes && (
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Notes</h4>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">{receipt.notes}</p>
                    </div>
                )}

                {/* Source Image / Attachment */}
                {receipt.imageUrl && (
                    <div className="mt-12 pt-8 border-t border-gray-100 print:hidden">
                        <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-4">Original Receipt Image</h4>
                        <div className="relative w-full max-w-md rounded-xl overflow-hidden border border-gray-200 shadow-sm group bg-gray-50 flex items-center justify-center min-h-[200px]">
                            <a href={receipt.imageUrl} target="_blank" rel="noreferrer" className="block relative w-full h-full cursor-zoom-in">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={receipt.imageUrl} alt="Original Receipt" className="w-full h-auto max-h-[600px] object-contain mx-auto group-hover:opacity-90 transition-opacity" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                        View Full Scan
                                    </span>
                                </div>
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-16 text-center border-t border-gray-100 pt-8 print:mt-8 print:pt-4">
                    <p className="text-sm text-[var(--muted)] mb-4">Thank you for your business!</p>
                    <div className="flex items-center justify-center gap-1.5 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">Verihub is powered by</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/tektriq-logo.png" alt="Tektriq LLC" className="h-3 w-auto object-contain" />
                        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">Tektriq LLC</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

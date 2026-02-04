import { getReceipt, getBusinessProfile } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import PrintButton from "@/components/PrintButton"; // Moved to components

// Force dynamic to avoid build-time DB access
export const dynamic = "force-dynamic";

export default async function ReceiptViewPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const receipt = await getReceipt(params.id);
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
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    &larr; History
                </Link>
                <div className="flex space-x-3">
                    <Link
                        href={`/receipt/${receipt.id}/edit`}
                        className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        Edit
                    </Link>
                    <PrintButton />
                    <a
                        href={`/api/pdf/${receipt.id}`}
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                    >
                        Download PDF
                    </a>
                </div>
            </div>

            {/* Receipt Paper */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-12 print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex items-start">
                        {business.logoPath && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={business.logoPath} alt="Logo" className="h-16 w-auto object-contain mr-6" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{business.businessName}</h1>
                            {business.businessAddress && (
                                <p className="mt-1 text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">{business.businessAddress}</p>
                            )}
                            {business.businessPhone && <p className="mt-1 text-sm text-gray-500">{business.businessPhone}</p>}
                            {business.businessEmail && <p className="text-sm text-gray-500">{business.businessEmail}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Receipt</div>
                        <div className="text-lg font-mono text-gray-900">#{receipt.receiptNumber}</div>
                        <div className="text-sm text-gray-500 mt-1">{format(receipt.date, "MMMM d, yyyy")}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-12">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bill To</h3>
                    <div className="text-lg text-gray-900 border-l-4 border-gray-100 pl-4">
                        {receipt.clientName || "Guest Client"}
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-12">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Item</th>
                                <th className="py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Qty</th>
                                <th className="py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                                <th className="py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {receipt.items.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="py-4 text-sm text-gray-900 font-medium">{item.description}</td>
                                    <td className="py-4 text-right text-sm text-gray-500">{item.quantity}</td>
                                    <td className="py-4 text-right text-sm text-gray-500">{Number(item.unitPrice).toFixed(2)}</td>
                                    <td className="py-4 text-right text-sm text-gray-900">{Number(item.lineTotal).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-full sm:w-1/2 md:w-1/3 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900 font-medium">{Number(receipt.subtotal).toFixed(2)}</span>
                        </div>
                        {receipt.taxType !== 'none' && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                    Tax {receipt.taxType === 'percent' ? `(${Number(receipt.taxValue)}%)` : ''}
                                </span>
                                <span className="text-gray-900 font-medium">
                                    {(Number(receipt.total) - Number(receipt.subtotal)).toFixed(2)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between py-4 border-t border-gray-200 mt-2 align-baseline">
                            <span className="text-lg font-bold text-gray-900">Total</span>
                            <span className="text-2xl font-bold text-gray-900">{Number(receipt.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {receipt.notes && (
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{receipt.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-16 text-center border-t border-gray-100 pt-8 print:mt-8 print:pt-4">
                    <p className="text-sm text-gray-400 mb-4">Thank you for your business!</p>
                    <div className="flex items-center justify-center gap-1.5 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Receipt Hub is powered by</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/tektriq-logo.png" alt="Tektriq" className="h-3 w-auto object-contain" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Tektriq</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

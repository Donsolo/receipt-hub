import { format } from "date-fns";

export default function ReceiptTemplate({ receipt, business }: { receipt: any, business: any }) {
    return (
        <div className="bg-white p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-start">
                    {business.logoPath && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}${business.logoPath}` : business.logoPath} alt="Logo" className="h-16 w-auto object-contain mr-4" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{business.businessName}</h1>
                        {business.businessAddress && (
                            <p className="mt-1 text-sm text-gray-500 whitespace-pre-wrap">{business.businessAddress}</p>
                        )}
                        {business.businessPhone && <p className="text-sm text-gray-500">{business.businessPhone}</p>}
                        {business.businessEmail && <p className="text-sm text-gray-500">{business.businessEmail}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-900">RECEIPT</h2>
                    <p className="mt-1 text-sm text-gray-500">#{receipt.receiptNumber}</p>
                    <p className="mt-1 text-sm text-gray-500">{format(new Date(receipt.date), "MMMM d, yyyy")}</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="mt-8 border-t border-gray-200 pt-8 mb-8">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Bill To</h3>
                <div className="mt-2 text-lg text-gray-900">
                    {receipt.clientName || "Guest Client"}
                </div>
            </div>

            {/* Items Table */}
            <div className="mt-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {receipt.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="py-4 text-sm text-gray-900">{item.description}</td>
                                <td className="py-4 text-right text-sm text-gray-500">{item.quantity}</td>
                                <td className="py-4 text-right text-sm text-gray-500">{Number(item.unitPrice).toFixed(2)}</td>
                                <td className="py-4 text-right text-sm text-gray-900">{Number(item.lineTotal).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="mt-8 border-t border-gray-200 pt-8 flex justify-end">
                <div className="w-1/2">
                    <div className="flex justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">Subtotal</span>
                        <span className="text-sm text-gray-900">{Number(receipt.subtotal).toFixed(2)}</span>
                    </div>
                    {receipt.taxType !== 'none' && (
                        <div className="flex justify-between py-2">
                            <span className="text-sm font-medium text-gray-500">
                                Tax {receipt.taxType === 'percent' ? `(${receipt.taxValue}%)` : '(Flat)'}
                            </span>
                            <span className="text-sm text-gray-900">
                                {(Number(receipt.total) - Number(receipt.subtotal)).toFixed(2)}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                        <span className="text-base font-bold text-gray-900">Total</span>
                        <span className="text-base font-bold text-gray-900">{Number(receipt.total).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
                <div className="mt-8 border-t border-gray-200 pt-8">
                    <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                    <p className="mt-2 text-sm text-gray-600">{receipt.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-12 text-center text-sm text-gray-500">
                <p>Thank you for your business!</p>
            </div>
        </div>
    );
}

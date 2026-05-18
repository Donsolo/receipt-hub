import { db as prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import { format } from 'date-fns';

export default async function InvoiceBundlePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    
    const invoice = await prisma.invoice.findUnique({
        where: { publicToken: token },
        include: { 
            items: true, 
            user: true,
            onlinePayments: {
                orderBy: { createdAt: 'desc' }
            },
            installments: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!invoice || invoice.status !== 'PAID') {
        notFound();
    }

    const safeInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientCompany: invoice.clientCompany,
        clientPhone: invoice.clientPhone,
        clientAddress: invoice.clientAddress,
        clientPropertyAddress: invoice.clientPropertyAddress,
        title: invoice.title,
        description: invoice.description,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue,
        tax: invoice.tax,
        total: invoice.total,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        status: invoice.status,
        viewCount: invoice.viewCount,
        lastViewedAt: invoice.lastViewedAt,
        createdAt: invoice.createdAt,
        sentAt: invoice.sentAt,
        isConverted: invoice.isConverted,
        paymentConfirmed: invoice.paymentConfirmed,
        paymentConfirmedAt: invoice.paymentConfirmedAt,
        authorizedSignature: invoice.authorizedSignature,
        
        acceptOnlinePayment: invoice.acceptOnlinePayment,
        paymentStatus: invoice.paymentStatus,
        amountPaid: invoice.amountPaid,
        remainingBalance: invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0)),
        convertedReceiptId: invoice.convertedReceiptId,
        
        publicToken: invoice.publicToken,
        ownerIsPro: (invoice.user?.plan === 'PRO' && invoice.user?.planStatus !== 'inactive') || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN',
        businessName: invoice.user?.businessName || invoice.user?.name || invoice.user?.email?.split('@')[0] || null,
        businessEmail: invoice.user?.email || null,
        businessPhone: invoice.user?.businessPhone || null,
        businessAddress: invoice.user?.businessAddress || null,
        businessLogoPath: (invoice.user?.plan === 'PRO' || invoice.user?.role === 'ADMIN' || invoice.user?.role === 'SUPER_ADMIN') ? invoice.user?.businessLogoPath : null,
        businessRegistrationNumber: invoice.user?.businessRegistrationNumber || null,
        attachedPhotos: invoice.attachedPhotos,
        depositAmount: invoice.depositAmount,
        paymentMethod: invoice.paymentMethod,
        payments: invoice.payments,
        onlinePayments: invoice.onlinePayments,
        paymentPlanEnabled: invoice.paymentPlanEnabled,
        installments: invoice.installments.map(i => ({
            id: i.id,
            label: i.label,
            amount: i.amount,
            dueDate: i.dueDate,
            status: i.status,
            paidAt: i.paidAt
        })),
        items: invoice.items.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total
        }))
    };

    return (
        <div className="min-h-screen bg-white text-black p-8 font-sans print:p-0">
            {/* Print action bar (hidden when printing) */}
            <div className="flex justify-end mb-8 print:hidden">
                <button 
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print Bundle
                </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-16">
                
                {/* 1. Official Invoice Document */}
                <div className="print-page border-b border-gray-200 pb-16 print:border-none print:pb-0">
                    <InvoiceDocument invoice={safeInvoice} />
                </div>

                {/* 2. Official Payment Receipt Summary */}
                <div className="print-page pt-16 print:pt-0">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Payment Receipt</h1>
                        <p className="text-gray-500 font-medium mt-2">Document Ref: {invoice.invoiceNumber || invoice.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Paid To</h3>
                            <div className="font-bold text-gray-900 text-lg">{safeInvoice.businessName}</div>
                            <div className="text-gray-600 mt-1">{safeInvoice.businessEmail}</div>
                            {safeInvoice.businessPhone && <div className="text-gray-600">{safeInvoice.businessPhone}</div>}
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Paid By</h3>
                            <div className="font-bold text-gray-900 text-lg">{safeInvoice.clientCompany || safeInvoice.clientName}</div>
                            {safeInvoice.clientCompany && <div className="text-gray-600 mt-1">{safeInvoice.clientName}</div>}
                            <div className="text-gray-600">{safeInvoice.clientEmail}</div>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Transaction History</h3>
                        
                        <div className="space-y-3">
                            {safeInvoice.onlinePayments && safeInvoice.onlinePayments.length > 0 ? (
                                safeInvoice.onlinePayments.map((payment: any) => (
                                    <div key={payment.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <div>
                                            <div className="font-bold text-gray-900">{format(new Date(payment.createdAt), 'MMMM d, yyyy h:mm a')}</div>
                                            <div className="text-sm text-gray-500">{payment.paymentMethod || 'Online Payment'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">${payment.amount.toFixed(2)}</div>
                                            <div className="text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded uppercase mt-1">{payment.status}</div>
                                        </div>
                                    </div>
                                ))
                            ) : safeInvoice.installments && safeInvoice.installments.length > 0 ? (
                                safeInvoice.installments.map((inst: any) => (
                                    <div key={inst.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <div>
                                            <div className="font-bold text-gray-900">{inst.label || 'Installment'}</div>
                                            <div className="text-sm text-gray-500">{inst.paidAt ? format(new Date(inst.paidAt), 'MMMM d, yyyy h:mm a') : 'Manual/Cash Payment'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">${inst.amount.toFixed(2)}</div>
                                            <div className="text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded uppercase mt-1">PAID</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 italic py-4">Paid via external/manual method.</div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <div className="bg-gray-900 text-white p-6 rounded-2xl w-full max-w-sm">
                            <div className="flex justify-between items-center mb-2 text-gray-400">
                                <span>Total Amount</span>
                                <span>${safeInvoice.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-2xl text-emerald-400 mt-4 pt-4 border-t border-gray-700">
                                <span>Balance Due</span>
                                <span>$0.00</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Inject print styles directly for page breaks */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    .print-page {
                        page-break-after: always;
                    }
                    .print-page:last-child {
                        page-break-after: auto;
                    }
                }
            `}} />
        </div>
    );
}

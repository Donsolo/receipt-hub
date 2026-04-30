import React from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export interface InvoiceDocumentProps {
    invoice: {
        id: string;
        invoiceNumber: string | null;
        clientName: string;
        clientEmail: string | null;
        clientCompany: string | null;
        clientPhone: string | null;
        clientAddress: string | null;
        clientPropertyAddress: string | null;
        title: string;
        description: string | null;
        currency: string;
        subtotal: number;
        discountType?: string;
        discountValue?: number;
        tax: number;
        total: number;
        issueDate: string;
        dueDate: string | null;
        notes: string | null;
        attachedPhotos?: any;
        status: string;
        isConverted: boolean;
        paymentConfirmed: boolean;
        paymentConfirmedAt: string | null;
        authorizedSignature?: string | null;
        publicToken?: string | null;
        businessName?: string | null;
        businessEmail?: string | null;
        businessPhone?: string | null;
        businessAddress?: string | null;
        businessLogoPath?: string | null;
        businessRegistrationNumber?: string | null;
        items: {
            id: string;
            name: string;
            description: string | null;
            quantity: number;
            unitPrice: number;
            total: number;
        }[];
    };
}

export default function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
    const isPaid = invoice.status === 'PAID';
    const isDraft = invoice.status === 'DRAFT';
    const isSent = invoice.status === 'SENT';
    
    const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date(new Date().setHours(0,0,0,0));
    
    // Smart Payment Logic
    const amountPaid = isPaid ? invoice.total : 0;
    const balanceDue = invoice.total - amountPaid;

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    return (
        <div className="w-full bg-white dark:bg-[#0b1220] rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col relative z-10 transition-all duration-500 print:shadow-none print:ring-0 print:rounded-none print:bg-white print:m-0 print:p-0">
            
            {/* --- PAID WATERMARK --- */}
            {isPaid && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 print:opacity-40">
                    <span className="text-[12rem] font-black text-emerald-500/5 dark:text-emerald-500/10 rotate-[-30deg] tracking-widest select-none print:text-emerald-600/[0.08]">
                        PAID
                    </span>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="px-6 py-8 sm:p-10 border-b border-gray-100 dark:border-[var(--border)] relative overflow-hidden bg-gray-50/50 dark:bg-black/20 print:bg-transparent print:border-gray-300">
                {/* Subtle visual accent for screen rendering */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 dark:bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none print:hidden"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8 relative z-10">
                    {/* Left: Business Identity & Invoice Core */}
                    <div className="w-full sm:w-auto flex flex-col">
                        <div className="flex items-center gap-4 mb-6 sm:mb-8 h-16 print:h-12">
                            {invoice.businessLogoPath ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={invoice.businessLogoPath} 
                                    alt="Business Logo" 
                                    className="max-h-16 max-w-[200px] object-contain rounded-sm mix-blend-multiply dark:mix-blend-normal print:mix-blend-normal" 
                                />
                            ) : invoice.businessName ? (
                                <div className="flex flex-col justify-center">
                                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none print:text-black">
                                        {invoice.businessName}
                                    </span>
                                    {invoice.businessRegistrationNumber && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 print:text-slate-600">
                                            Reg/EIN: {invoice.businessRegistrationNumber}
                                        </span>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Extended Business Metadata */}
                        {(invoice.businessEmail || invoice.businessPhone) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
                                {invoice.businessEmail && <span>{invoice.businessEmail}</span>}
                                {invoice.businessEmail && invoice.businessPhone && <span className="text-slate-300 dark:text-slate-700 print:text-slate-400">&bull;</span>}
                                {invoice.businessPhone && <span>{invoice.businessPhone}</span>}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            {isPaid ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 print:text-emerald-800 print:border-current print:bg-transparent">
                                    Paid
                                </span>
                            ) : isOverdue ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 print:text-red-800 print:border-current print:bg-transparent">
                                    Overdue
                                </span>
                            ) : isDraft ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 print:text-slate-600 print:border-current print:bg-transparent">
                                    Draft
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 print:text-blue-800 print:border-current print:bg-transparent">
                                    Sent
                                </span>
                            )}
                            
                            {invoice.invoiceNumber && (
                                <span className="inline-flex items-center text-sm font-mono font-bold text-slate-600 dark:text-slate-300 print:text-slate-800">
                                    #{invoice.invoiceNumber}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight print:text-black">
                            {invoice.title}
                        </h1>
                        {invoice.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md print:text-slate-600 print:line-clamp-none">
                                {invoice.description}
                            </p>
                        )}
                    </div>

                    {/* Right: Client / Billed To */}
                    <div className="text-left sm:text-right w-full sm:w-auto p-5 sm:p-0 bg-white/60 dark:bg-black/20 rounded-2xl ring-1 ring-black/5 sm:ring-0 dark:ring-0 sm:bg-transparent sm:dark:bg-transparent print:bg-transparent print:ring-0 print:p-0 print:text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 print:text-slate-500">
                            Billed To
                        </p>
                        
                        {invoice.clientCompany && (
                            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight print:text-black">
                                {invoice.clientCompany}
                            </p>
                        )}
                        <p className={clsx("font-semibold text-slate-800 dark:text-slate-200 print:text-slate-800", invoice.clientCompany ? "text-sm mt-0.5" : "text-base sm:text-lg font-bold text-slate-900 dark:text-white print:text-black")}>
                            {invoice.clientName}
                        </p>
                        
                        {(invoice.clientEmail || invoice.clientPhone) && (
                            <div className="mt-1 space-y-0.5">
                                {invoice.clientEmail && <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">{invoice.clientEmail}</p>}
                                {invoice.clientPhone && <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">{invoice.clientPhone}</p>}
                            </div>
                        )}

                        {invoice.clientAddress && (
                            <pre className="text-sm text-slate-500 dark:text-slate-400 font-sans mt-3 whitespace-pre-wrap leading-relaxed print:text-slate-600">
                                {invoice.clientAddress}
                            </pre>
                        )}
                        
                        {/* Service Property Address Block */}
                        {invoice.clientPropertyAddress && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 print:border-slate-300">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">
                                    Service Address
                                </p>
                                <pre className="text-sm text-slate-500 dark:text-slate-400 font-sans whitespace-pre-wrap leading-relaxed print:text-slate-600">
                                    {invoice.clientPropertyAddress}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- METADATA STRIP --- */}
            <div className="px-6 py-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-transparent border-b border-gray-100 dark:border-[var(--border)] print:border-gray-300 print:bg-transparent">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">Date Issued</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</p>
                </div>
                {invoice.dueDate && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">Due Date</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 print:text-slate-500">Invoice ID</p>
                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-widest print:text-black">{invoice.id.split('-')[0].slice(0, 8)}</p>
                </div>
                {isPaid && invoice.paymentConfirmedAt && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-600 mb-1.5 print:text-emerald-700">Payment Received</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{format(new Date(invoice.paymentConfirmedAt), 'MMM d, yyyy')}</p>
                    </div>
                )}
                {isOverdue && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-500 mb-1.5 print:text-red-600">Status</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 print:text-red-600">
                            {Math.floor((new Date().getTime() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24))} Days Overdue
                        </p>
                    </div>
                )}
            </div>

            {/* --- LINE ITEMS --- */}
            <div className="px-6 py-8 sm:px-10 flex-1 bg-white dark:bg-transparent print:bg-transparent relative z-10">
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-800 print:border-slate-400">
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider print:text-black">Item / Description</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-24 print:text-black">Qty</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-32 print:text-black">Rate</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-32 print:text-black">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-300">
                            {invoice.items.map((item) => (
                                <tr key={item.id} className="group print:break-inside-avoid">
                                    <td className="py-5 px-2 align-top">
                                        <div className="font-bold text-slate-900 dark:text-white print:text-black">{item.name}</div>
                                        {item.description && (
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap print:text-slate-700">
                                                {item.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-5 px-2 align-top text-center text-sm font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
                                        {item.quantity}
                                    </td>
                                    <td className="py-5 px-2 align-top text-right text-sm font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
                                        {formatCurrency(item.unitPrice, invoice.currency)}
                                    </td>
                                    <td className="py-5 px-2 align-top text-right font-bold text-slate-900 dark:text-white print:text-black">
                                        {formatCurrency(item.total, invoice.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- TOTALS BLOCK --- */}
                <div className="mt-8 flex flex-col items-end print:break-inside-avoid">
                    <div className="w-full sm:w-[380px] bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 ring-1 ring-slate-200 dark:ring-slate-700/50 shadow-sm print:bg-transparent print:ring-0 print:border print:border-slate-300 print:rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium print:text-slate-700">Subtotal</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums print:text-black">
                                {formatCurrency(invoice.subtotal, invoice.currency)}
                            </span>
                        </div>
                        
                        {invoice.discountType && invoice.discountType !== 'none' && (
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium print:text-slate-700">
                                    Discount {invoice.discountType === 'percent' && `(${invoice.discountValue}%)`}
                                </span>
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums print:text-black">
                                    -{formatCurrency(
                                        invoice.discountType === 'percent' 
                                            ? invoice.subtotal * ((invoice.discountValue || 0) / 100) 
                                            : invoice.discountValue || 0,
                                        invoice.currency
                                    )}
                                </span>
                            </div>
                        )}

                        {invoice.tax !== null && invoice.tax > 0 && (
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700/50 print:border-slate-300">
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium print:text-slate-700">Tax</span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums print:text-black">
                                    {formatCurrency(invoice.tax, invoice.currency)}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-end mt-4">
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-slate-900 dark:text-white print:text-black">Total</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums print:text-black">
                                {formatCurrency(invoice.total, invoice.currency)}
                            </span>
                        </div>
                        
                        {amountPaid > 0 && (
                            <div className="flex justify-between items-center mt-3 text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                                <span className="text-sm font-medium">Amount Paid</span>
                                <span className="text-base font-semibold tabular-nums">-{formatCurrency(amountPaid, invoice.currency)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-end mt-5 pt-5 border-t-2 border-slate-200 dark:border-slate-700 print:border-slate-300">
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-slate-900 dark:text-white print:text-black">Balance Due</span>
                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 print:text-slate-500">
                                    {invoice.currency}
                                </span>
                            </div>
                            <span className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-500 tabular-nums tracking-tight print:text-black">
                                {balanceDue === 0 ? "Paid in Full" : formatCurrency(balanceDue, invoice.currency)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER: NOTES & ATTACHMENTS --- */}
                {invoice.notes && (
                    <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 print:border-slate-300 print:break-inside-avoid">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 print:text-slate-600">Terms & Additional Notes</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed print:text-slate-800">
                            {invoice.notes}
                        </p>
                    </div>
                )}

                {invoice.attachedPhotos && Array.isArray(invoice.attachedPhotos) && invoice.attachedPhotos.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 print:break-inside-avoid print:border-slate-300">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 print:text-slate-600">Attached Media</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {invoice.attachedPhotos.map((photo: string, i: number) => (
                                <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity print:border-slate-300">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* --- AUTHORIZED SIGNATURE --- */}
                <div className="mt-12 pt-8 flex justify-end print:break-inside-avoid">
                    <div className="w-full sm:w-80 flex flex-col items-center">
                        {invoice.authorizedSignature ? (
                            <div className="flex flex-col items-center mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={invoice.authorizedSignature} alt="Authorized Signature" className="h-16 object-contain mix-blend-multiply dark:mix-blend-normal dark:invert print:mix-blend-normal print:invert-0" />
                            </div>
                        ) : (
                            <div className="w-full border-b border-slate-300 dark:border-slate-600 print:border-slate-400 h-16 mb-2"></div>
                        )}
                        <div className="w-full border-t border-slate-200 dark:border-slate-700/50 print:border-slate-300 pt-3 text-center">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">Authorized Signature</p>
                            {invoice.paymentConfirmedAt && invoice.authorizedSignature && (
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1 print:text-slate-500">
                                    Signed: {format(new Date(invoice.paymentConfirmedAt), 'MMM d, yyyy - h:mm a')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* --- TRUST LAYER FOOTER --- */}
                <div className="mt-16 pt-6 border-t border-slate-100 dark:border-slate-800/50 print:border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-slate-400 dark:text-slate-500 print:text-slate-500">
                            Generated on {format(new Date(), 'MMM d, yyyy')}
                        </p>
                        {invoice.publicToken && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 print:text-slate-400">
                                Verify this invoice at verihub.app/invoice/{invoice.publicToken}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 opacity-60 grayscale print:opacity-100 print:grayscale-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 print:text-slate-500">Securely issued via</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/assets/text-logo.png" alt="Verihub" className="h-3 w-auto dark:invert print:invert-0" />
                    </div>
                </div>
            </div>
        </div>
    );
}

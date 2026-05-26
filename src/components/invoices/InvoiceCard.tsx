import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import InvoiceActions from './InvoiceActions';

export default function InvoiceCard({ invoice, isPro }: { invoice: any, isPro: boolean }) {
    const viewUrl = invoice.status === 'DRAFT' || invoice.status === 'CANCELLED'
        ? `/dashboard/invoices/edit/${invoice.id}`
        : invoice.isConverted && invoice.convertedReceiptId
            ? `/receipt/${invoice.convertedReceiptId}`
            : invoice.publicToken 
                ? `/invoice/${invoice.publicToken}` 
                : `/dashboard/invoices/edit/${invoice.id}`;

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm flex flex-col gap-4 relative">
            <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col min-w-0">
                    <div className="font-bold text-[var(--text)] text-base leading-tight truncate">
                        {invoice.title}
                    </div>
                    <div className="text-sm text-[var(--muted)] mt-0.5 truncate font-medium">
                        {invoice.clientName}
                    </div>
                    {invoice.invoiceNumber && (
                        <div className="text-xs text-[var(--muted)]/80 font-mono mt-0.5">
                            #{invoice.invoiceNumber}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="font-black text-[var(--text)] text-lg tabular-nums tracking-tight">
                        ${invoice.total.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        {invoice.status === 'PAID' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">PAID</span>}
                        {invoice.status === 'DRAFT' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--muted)]/10 text-[var(--muted)] border border-[var(--border)]">DRAFT</span>}
                        {invoice.status === 'SENT' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">SENT</span>}
                        {invoice.status === 'VIEWED' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">VIEWED</span>}
                        {invoice.status === 'CANCELLED' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">CANCELLED</span>}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <div className="text-[11px] text-[var(--muted)] font-medium">
                        {invoice.viewCount > 0 ? (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Viewed {invoice.lastViewedAt ? formatDistanceToNow(new Date(invoice.lastViewedAt), { addSuffix: true }) : ''}
                            </span>
                        ) : (
                            <span>Issued {formatDistanceToNow(new Date(invoice.issueDate), { addSuffix: true })}</span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Link 
                        href={viewUrl}
                        className="px-4 py-1.5 bg-[var(--text)] hover:bg-[var(--text)]/90 text-[var(--bg)] text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                        View
                    </Link>
                    <InvoiceActions 
                        invoice={{ 
                            id: invoice.id, 
                            status: invoice.status, 
                            isConverted: invoice.isConverted, 
                            publicToken: invoice.publicToken, 
                            convertedReceiptId: invoice.convertedReceiptId,
                            acceptOnlinePayment: invoice.acceptOnlinePayment,
                            paymentStatus: invoice.paymentStatus,
                            remainingBalance: invoice.remainingBalance
                        }} 
                        isPro={isPro} 
                    />
                </div>
            </div>
        </div>
    );
}

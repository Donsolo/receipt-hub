'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Installment {
    id: string;
    label: string | null;
    amount: number;
    dueDate: string | null;
    status: string;
    paidAt: string | null;
}

interface CustomerPortalViewerProps {
    token: string;
    source?: string | null;
    requestLogId?: string | null;
}

export default function CustomerPortalViewer({ token, source, requestLogId }: CustomerPortalViewerProps) {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    useEffect(() => {
        async function fetchInvoice() {
            try {
                const res = await fetch(`/api/public/invoice/${token}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load portal');
                setInvoice(data.invoice);

                // Safely track the view
                fetch(`/api/public/invoice/${token}/track-payment-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: 'PORTAL_VIEW',
                        channel: source || 'PUBLIC',
                        requestLogId: requestLogId || null
                    })
                }).catch(() => {}); // Fire and forget
                
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchInvoice();
    }, [token, source, requestLogId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#030712]">
                <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#030712] p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Unavailable</h1>
                <p className="text-gray-500 dark:text-[var(--muted)] max-w-sm">{error || "This payment portal is not available."}</p>
            </div>
        );
    }

    const isFullyPaid = invoice.paymentStatus === 'PAID';
    const remainingBalance = invoice.remainingBalance ?? (invoice.total - (invoice.amountPaid || 0));

    const handleCheckout = async (installmentId?: string) => {
        setIsCheckoutLoading(true);
        try {
            // Track Click
            await fetch(`/api/public/invoice/${token}/track-payment-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: installmentId ? 'INSTALLMENT_CTA_CLICK' : 'PAYMENT_CTA_CLICK',
                    channel: source || 'PUBLIC',
                    requestLogId: requestLogId || null,
                    installmentId
                })
            }).catch(() => {});

            // Redirect to Stripe
            const res = await fetch(`/api/public/invoice/${token}/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installmentId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to initialize secure checkout.');
            }
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] font-sans text-[var(--text)] pb-24">
            {/* Header */}
            <header className="bg-white dark:bg-[#0b1220] border-b border-black/5 dark:border-white/10 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {invoice.businessLogoPath ? (
                            <img src={invoice.businessLogoPath} alt={invoice.businessName} className="h-10 w-auto rounded object-contain" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-lg">
                                {invoice.businessName?.charAt(0).toUpperCase() || 'B'}
                            </div>
                        )}
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white leading-tight">{invoice.businessName || 'Business'}</div>
                            <div className="text-xs text-gray-500 dark:text-[var(--muted)]">Payment Portal</div>
                        </div>
                    </div>
                    <div>
                        {isFullyPaid ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-full">Paid</span>
                        ) : remainingBalance < invoice.total ? (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-full">Partial</span>
                        ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 font-bold text-xs uppercase tracking-wider rounded-full">Unpaid</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
                
                {/* Balance Summary Card */}
                <section className={clsx("rounded-3xl p-8 shadow-xl relative overflow-hidden", isFullyPaid ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-600/20" : "bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-600/20")}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div>
                            <h2 className="text-indigo-100 dark:text-indigo-100 font-medium text-sm uppercase tracking-wider mb-2">
                                {isFullyPaid ? 'Invoice Settled' : 'Total Amount Due'}
                            </h2>
                            <div className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight">
                                ${remainingBalance.toFixed(2)}
                            </div>
                            <p className="mt-2 text-indigo-100/80 text-sm">
                                Invoice #{invoice.invoiceNumber || invoice.title} • Total: ${invoice.total.toFixed(2)}
                            </p>
                        </div>
                        
                        {!isFullyPaid && invoice.ownerIsPro && invoice.acceptOnlinePayment && !invoice.paymentPlanEnabled && (
                            <button
                                disabled={isCheckoutLoading}
                                onClick={() => handleCheckout()}
                                className={clsx("w-full md:w-auto px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2", isCheckoutLoading && "opacity-70 cursor-not-allowed")}
                            >
                                {isCheckoutLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Pay ${remainingBalance.toFixed(2)}
                                    </>
                                )}
                            </button>
                        )}

                        {isFullyPaid && (
                            <a 
                                href={`/invoice/${token}/bundle`}
                                className="w-full md:w-auto px-8 py-4 bg-white text-emerald-600 font-black rounded-2xl shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-center"
                            >
                                Download Receipt
                            </a>
                        )}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Payment Schedule (If Enabled) */}
                        {invoice.paymentPlanEnabled && invoice.installments && invoice.installments.length > 0 && (
                            <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                                <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Payment Schedule</h3>
                                </div>
                                <div className="divide-y divide-black/5 dark:divide-white/10">
                                    {invoice.installments.map((inst: Installment, index: number) => (
                                        <div key={inst.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                            <div className="flex-1 text-center sm:text-left">
                                                <div className="font-bold text-gray-900 dark:text-white text-lg">
                                                    {inst.label || \`Installment \${index + 1}\`}
                                                </div>
                                                {inst.dueDate && (
                                                    <div className="text-sm text-gray-500 dark:text-[var(--muted)] mt-1">
                                                        Due: {format(new Date(inst.dueDate), 'MMM d, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                                                \${inst.amount.toFixed(2)}
                                            </div>
                                            <div className="w-full sm:w-auto">
                                                {inst.status === 'PAID' ? (
                                                    <div className="px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold rounded-xl text-sm w-full text-center">Paid</div>
                                                ) : inst.status === 'PAYMENT_PENDING' ? (
                                                    <div className="px-4 py-2 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-bold rounded-xl text-sm w-full text-center">Pending</div>
                                                ) : invoice.ownerIsPro && invoice.acceptOnlinePayment ? (
                                                    <button
                                                        disabled={isCheckoutLoading}
                                                        onClick={() => handleCheckout(inst.id)}
                                                        className={clsx("w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors", isCheckoutLoading && "opacity-70 cursor-not-allowed")}
                                                    >
                                                        Pay
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Invoice Items Summary */}
                        <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white">Invoice Details</h3>
                                <a href={`/invoice/${token}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View Original Document</a>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {invoice.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-[var(--muted)]">{item.quantity} x ${item.unitPrice.toFixed(2)}</div>
                                            </div>
                                            <div className="font-medium tabular-nums">${item.total.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        {/* Payment History */}
                        <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                <h3 className="font-bold text-gray-900 dark:text-white">Payment History</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {(!invoice.onlinePayments || invoice.onlinePayments.length === 0) && (!invoice.installments || invoice.installments.filter((i:any)=>i.status==='PAID').length === 0) && (
                                    <div className="text-center text-sm text-gray-500 dark:text-[var(--muted)] py-4">No payments recorded yet.</div>
                                )}
                                
                                {invoice.onlinePayments?.map((payment: any) => (
                                    <div key={payment.id} className="flex items-start gap-3">
                                        <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">${payment.amount.toFixed(2)}</div>
                                            <div className="text-xs text-gray-500 dark:text-[var(--muted)]">{format(new Date(payment.createdAt), 'MMM d, yyyy • h:mm a')}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">{payment.paymentMethod || 'Online Payment'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Customer Support Info */}
                        <section className="bg-white dark:bg-[#0b1220] rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden p-6 text-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Need help?</h3>
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-4">Contact {invoice.businessName} directly regarding this invoice.</p>
                            {invoice.businessEmail && (
                                <a href={`mailto:${invoice.businessEmail}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                    {invoice.businessEmail}
                                </a>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

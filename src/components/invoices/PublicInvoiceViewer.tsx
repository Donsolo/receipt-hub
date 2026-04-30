"use client";

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import InvoiceDocument from './InvoiceDocument';

interface PublicInvoice {
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
    createdAt: string;
    businessName?: string | null;
    businessEmail?: string | null;
    businessPhone?: string | null;
    businessAddress?: string | null;
    businessLogoPath?: string | null;
    businessRegistrationNumber?: string | null;
    authorizedSignature?: string | null;
    publicToken?: string | null;
    viewCount: number;
    lastViewedAt: string | null;
    sentAt: string | null;
    items: {
        id: string;
        name: string;
        description: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
}

export default function PublicInvoiceViewer({ token, isAuthenticated = false }: { token: string; isAuthenticated?: boolean }) {
    const router = useRouter();
    const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await fetch(`/api/public/invoice/${token}`);
                const data = await res.json();
                
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to open invoice. The link may be invalid.');
                }
                
                setInvoice(data.invoice);

                // Non-blocking background tracking (Exclude bots & PDF generator)
                const userAgent = navigator.userAgent.toLowerCase();
                const isBot = /bot|googlebot|crawler|spider|robot|crawling|headlesschrome|puppeteer|verihub-pdf/i.test(userAgent);
                if (!isBot) {
                    fetch(`/api/public/invoice/${token}/track`, { method: 'POST' }).catch(() => {});
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();
    }, [token]);

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pt-8 sm:pt-16 pb-24 px-4 sm:px-6 animate-pulse">
                <div className="bg-white dark:bg-[var(--card)] rounded-3xl shadow-xl overflow-hidden flex flex-col relative ring-1 ring-black/5 dark:ring-white/5">
                    <div className="px-6 py-8 sm:p-10 border-b border-gray-100 dark:border-[var(--border)] bg-gray-50/50 dark:bg-black/20 flex flex-col sm:flex-row justify-between gap-6">
                        <div className="space-y-4 w-full max-w-sm">
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-32"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        </div>
                        <div className="space-y-3 w-full sm:w-48 text-right">
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-16 ml-auto"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                        </div>
                    </div>
                    <div className="px-6 py-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-transparent border-b border-gray-100 dark:border-[var(--border)]">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                    </div>
                    <div className="px-6 py-8 sm:px-10 flex-1 bg-white dark:bg-transparent min-h-[300px]">
                        <div className="space-y-6">
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-inner ring-1 ring-red-500/20">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-xl font-bold text-[var(--text)] mb-3">Link Invalid or Expired</h1>
                <p className="text-sm text-[var(--muted)] mb-8 leading-relaxed">
                    {error || 'This secure invoice link is no longer active. Please request a new link from the sender.'}
                </p>
            </div>
        );
    }

    const isPaid = invoice.status === 'PAID';
    const statusIndex = invoice.status === 'PAID' ? 3 : invoice.status === 'VIEWED' ? 2 : invoice.status === 'SENT' ? 1 : 0;

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pt-4 sm:pt-8 bg-gray-50/50 dark:bg-[#0b1220] print:bg-white print:dark:bg-white">
            
            {/* Owner Analytics Banner */}
            {isAuthenticated && (
                <div className="w-full px-4 sm:px-6 mb-4 print:hidden animate-in slide-in-from-top-4 fade-in">
                    <div className="flex flex-col bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 sm:p-5 gap-6">
                        
                        {/* Header & Metrics */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Invoice Lifecycle</h3>
                                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 font-medium mt-0.5">
                                        {invoice.status === 'SENT' && invoice.viewCount === 0 && invoice.sentAt && (Date.now() - new Date(invoice.sentAt).getTime() > 24 * 60 * 60 * 1000) ? (
                                            <span className="text-red-500 font-bold">Not yet viewed (over 24h)</span>
                                        ) : invoice.status === 'VIEWED' ? (
                                            <span className="text-purple-600 dark:text-purple-400 font-bold">Client has viewed this invoice</span>
                                        ) : (
                                            "Analytics are hidden from clients."
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto bg-white/60 dark:bg-black/20 rounded-xl p-2.5 sm:px-4 sm:py-2 border border-indigo-100 dark:border-white/5">
                                <div className="flex flex-col relative group">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Views</span>
                                        <span title="Views exclude PDF generation and common social preview bots.">
                                            <svg className="w-3 h-3 text-[var(--muted)]/50 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--text)] tabular-nums">{invoice.viewCount || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Timeline */}
                        <div className="w-full flex items-start justify-between relative mt-2 px-2 sm:px-8">
                            {/* Draft */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 0 ? "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-500/20" : "bg-indigo-200 dark:bg-indigo-500/40 text-indigo-700 dark:text-indigo-200 ring-indigo-50 dark:ring-indigo-500/10")}>
                                    {statusIndex > 0 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 0 ? "text-indigo-900 dark:text-indigo-300" : "text-indigo-700 dark:text-indigo-400")}>Draft</span>
                                    {invoice.createdAt && <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true })}</span>}
                                </div>
                                <div className={clsx("absolute top-3 left-1/2 w-full h-[2px] -z-10", statusIndex > 0 ? "bg-indigo-200 dark:bg-indigo-500/40" : "bg-indigo-100 dark:bg-white/5")} />
                            </div>

                            {/* Sent */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 1 ? "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-500/20" : statusIndex > 1 ? "bg-indigo-200 dark:bg-indigo-500/40 text-indigo-700 dark:text-indigo-200 ring-indigo-50 dark:ring-indigo-500/10" : "bg-white dark:bg-black/20 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 ring-transparent")}>
                                    {statusIndex > 1 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 1 ? "text-indigo-900 dark:text-indigo-300" : statusIndex > 1 ? "text-indigo-700 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")}>Sent</span>
                                    {invoice.sentAt && <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.sentAt), { addSuffix: true })}</span>}
                                </div>
                                <div className={clsx("absolute top-3 left-1/2 w-full h-[2px] -z-10", statusIndex > 1 ? "bg-indigo-200 dark:bg-indigo-500/40" : "bg-indigo-100 dark:bg-white/5")} />
                            </div>

                            {/* Viewed */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 2 ? "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-500/20" : statusIndex > 2 ? "bg-indigo-200 dark:bg-indigo-500/40 text-indigo-700 dark:text-indigo-200 ring-indigo-50 dark:ring-indigo-500/10" : "bg-white dark:bg-black/20 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 ring-transparent")}>
                                    {statusIndex > 2 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 2 ? "text-indigo-900 dark:text-indigo-300" : statusIndex > 2 ? "text-indigo-700 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")}>Viewed</span>
                                    {invoice.lastViewedAt && <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.lastViewedAt), { addSuffix: true })}</span>}
                                </div>
                                <div className={clsx("absolute top-3 left-1/2 w-full h-[2px] -z-10", statusIndex > 2 ? "bg-indigo-200 dark:bg-indigo-500/40" : "bg-indigo-100 dark:bg-white/5")} />
                            </div>

                            {/* Paid */}
                            <div className="flex flex-col items-center relative flex-1 text-center z-10">
                                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ring-4", statusIndex === 3 ? "bg-emerald-500 text-white ring-emerald-100 dark:ring-emerald-500/20" : "bg-white dark:bg-black/20 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 ring-transparent")}>
                                    {statusIndex === 3 ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                </div>
                                <div className="mt-2 flex flex-col items-center">
                                    <span className={clsx("text-[10px] sm:text-xs font-bold uppercase tracking-wider", statusIndex === 3 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500")}>Paid</span>
                                    {invoice.paymentConfirmedAt && <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5 whitespace-nowrap">{formatDistanceToNow(new Date(invoice.paymentConfirmedAt), { addSuffix: true })}</span>}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Print Toolbar & Exit Action */}
            <div className="w-full flex justify-between items-center px-4 sm:px-6 mb-4 print:hidden">
                <button
                    onClick={() => {
                        if (isAuthenticated) {
                            router.push('/dashboard/invoices');
                        } else {
                            router.push('/');
                        }
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[var(--card)] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white ring-1 ring-black/5 dark:ring-white/10 shadow-sm transition-all"
                    title="Close Viewer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-center gap-3">
                    <a 
                        href={`/api/public/invoice/${token}/pdf`}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl shadow-sm transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden sm:inline">Download PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </a>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[var(--card)] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-[var(--text)] text-sm font-bold rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full flex flex-col pb-24 px-4 sm:px-6 print:p-0 print:m-0 print:block">
            
            <InvoiceDocument invoice={invoice} />

            {/* --- SHARE & DISTRIBUTION LAYER (SCREEN ONLY) --- */}
            <div className="mt-8 bg-white dark:bg-[#0b1220] rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-black/5 dark:ring-white/10 px-6 py-8 sm:p-10 relative overflow-hidden print:hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Share this Invoice</h3>
                        <p className="text-sm text-gray-500 dark:text-[var(--muted)]">Send a secure link to your client or download it directly.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                navigator.clipboard.writeText(url);
                                alert('Invoice link copied to clipboard!');
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-[var(--text)] text-sm font-bold rounded-xl transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Copy Link
                        </button>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                if (navigator.share) {
                                    navigator.share({ title: invoice.title, url });
                                } else {
                                    navigator.clipboard.writeText(url);
                                    alert('Invoice link copied to clipboard!');
                                }
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 text-sm font-bold rounded-xl transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Share
                        </button>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                window.open(`mailto:?subject=${encodeURIComponent('Invoice from ' + (invoice.businessName || 'Verihub'))}&body=${encodeURIComponent('View your invoice securely online:\n' + url)}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title="Share via Email"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </button>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('View your invoice from ' + (invoice.businessName || 'Verihub'))}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors"
                            title="Share on X"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </button>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Share on Facebook"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                        </button>
                    </div>
                    
                    <a 
                        href={`/api/public/invoice/${token}/pdf`}
                        download
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl transition-all w-full sm:w-auto"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download PDF
                    </a>
                </div>
            </div>

            {/* Verihub CTA (Watermark Footer) */}
            <div className="mt-16 flex flex-col items-center justify-center text-center pb-8 transition-all duration-500 print:hidden">
                <div className="flex flex-col items-center gap-4 bg-white/60 dark:bg-black/20 p-8 rounded-3xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-md max-w-sm w-full shadow-lg shadow-black/5">
                    <img src="/assets/text-logo.png" alt="Verihub" className="h-6 w-auto dark:invert mb-1" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Start using Verihub</h4>
                    <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium px-4">Create, track, and get paid with secure professional invoices.</p>
                    <Link href="/register" className="w-full mt-4 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                        Create your own invoices
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </Link>
                </div>
            </div>

            </div>
        </div>
    );
}

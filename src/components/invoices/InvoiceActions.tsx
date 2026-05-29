"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function InvoiceActions({ invoice, isPro, trigger }: { invoice: { id: string; status: string; isConverted: boolean; publicToken?: string | null; convertedReceiptId?: string | null; acceptOnlinePayment?: boolean; paymentStatus?: string; remainingBalance?: number | null; paymentPlanEnabled?: boolean; installments?: any[]; }, isPro?: boolean, trigger?: React.ReactNode }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    // Sharing States
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [connections, setConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedInstallmentId, setSelectedInstallmentId] = useState('');

    // Dropdown State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeMenu = () => setIsMenuOpen(false);

    const handleAction = async (action: 'convert' | 'mark-paid' | 'delete' | 'toggle-payment') => {
        closeMenu();
        let confirmMsg = '';
        if (action === 'delete') confirmMsg = 'Are you sure you want to permanently delete this invoice?';
        if (action === 'convert') confirmMsg = 'Convert this PAID invoice to a permanent Receipt? This cannot be undone and will lock the invoice.';
        if (action === 'mark-paid') confirmMsg = 'Mark this invoice as PAID?';
        if (action === 'toggle-payment') confirmMsg = invoice.acceptOnlinePayment ? 'Disable online payments for this invoice?' : 'Enable secure online payments via Stripe for this invoice?';

        if (!window.confirm(confirmMsg)) return;

        setIsLoading(true);
        try {
            if (action === 'toggle-payment') {
                const res = await fetch(`/api/invoices/${invoice.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ acceptOnlinePayment: !invoice.acceptOnlinePayment })
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to toggle online payments');
                }
            } else {
                const endpoint = `/api/invoices/${invoice.id}${action === 'delete' ? '' : `/${action}`}`;
                const method = action === 'delete' ? 'DELETE' : 'POST';

                const res = await fetch(endpoint, { method });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || `Failed to execute action.`);
                }
            }

            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getOrCreateToken = async () => {
        const res = await fetch(`/api/invoices/${invoice.id}/generate-token`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate access link');
        return data.token;
    };

    const handleCopyLink = async () => {
        closeMenu();
        setIsLoading(true);
        try {
            const token = await getOrCreateToken();
            const link = `${window.location.origin}/portal/invoice/${token}?src=copy`;
            await navigator.clipboard.writeText(link);
            alert('Secure portal link copied.');
            
            // Log activity silently
            fetch(`/api/invoices/${invoice.id}/log-link-copy`, { method: 'POST' }).catch(() => {});
        } catch (error: any) {
            console.error(error);
            alert('Failed to copy link: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenShareModal = async () => {
        closeMenu();
        setIsShareModalOpen(true);
        await loadConnections();
    };

    const handleOpenPaymentRequestModal = async () => {
        closeMenu();
        if (!invoice.acceptOnlinePayment) {
            if (!window.confirm('Online payments are currently disabled for this invoice. You must enable secure Stripe payments to send a payment request. Enable now?')) {
                return;
            }
        }
        setIsPaymentRequestModalOpen(true);
        await loadConnections();
    };

    const loadConnections = async () => {
        setIsLoadingConnections(true);
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            if (res.ok) setConnections(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleSendToClient = async (userId: string) => {
        setIsSending(true);
        try {
            const token = await getOrCreateToken();
            const link = `${window.location.origin}/invoice/${token}`;
            
            const res = await fetch(`/api/messages/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `You have received a new secure Invoice.\n\nPlease review and confirm payment here:\n${link}`
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send message');
            }

            alert('Invoice sent successfully to client via Network Messages.');
            setIsShareModalOpen(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendPaymentRequest = async (userId: string) => {
        setIsSending(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send-payment-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientUserId: userId,
                    enableOnlinePayment: true // Enable it if they agreed to the prompt
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to send payment request');
            }

            alert('Payment request sent securely via Network Messages!');
            setIsPaymentRequestModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendEmailRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send-payment-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailRecipient, message: customMessage, enableOnlinePayment: true })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send email request');
            alert('Email payment request sent securely!');
            setIsEmailModalOpen(false);
            setEmailRecipient('');
            setCustomMessage('');
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendReminder = async (channel: 'EMAIL' | 'NETWORK', recipientIdOrEmail: string) => {
        setIsSending(true);
        try {
            const body: any = { channel, message: customMessage };
            if (selectedInstallmentId) body.installmentId = selectedInstallmentId;
            if (channel === 'EMAIL') body.email = recipientIdOrEmail;
            if (channel === 'NETWORK') body.recipientUserId = recipientIdOrEmail;

            const res = await fetch(`/api/invoices/${invoice.id}/send-payment-reminder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reminder');
            alert('Payment reminder sent!');
            setIsReminderModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleOpenEmailModal = () => {
        closeMenu();
        if (!invoice.acceptOnlinePayment) {
            if (!window.confirm('Online payments are disabled. Enable secure Stripe payments to send this request?')) return;
        }
        setIsEmailModalOpen(true);
    };

    const handleOpenReminderModal = async () => {
        closeMenu();
        setIsReminderModalOpen(true);
        setSelectedInstallmentId('');
        await loadConnections();
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {trigger ? (
                <div onClick={() => setIsMenuOpen(!isMenuOpen)} className={clsx("inline-block", isLoading && "opacity-50 cursor-not-allowed")}>
                    {trigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    disabled={isLoading}
                    className={clsx(
                        "flex items-center justify-center p-2 rounded-lg transition-colors border outline-none",
                        isMenuOpen 
                            ? "bg-gray-100 border-gray-300 dark:bg-white/10 dark:border-white/20 text-gray-900 dark:text-white"
                            : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5",
                        isLoading && "opacity-50 cursor-not-allowed"
                    )}
                    title="Options"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    )}
                </button>
            )}

            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-[var(--card)] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-[70] max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-[var(--border)]">
                    
                    {/* View and Copy Options */}
                    <div className="py-1">
                        <button onClick={handleCopyLink} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Copy Public Link
                        </button>
                    </div>

                    {/* Send & Request Options */}
                    {!invoice.isConverted && invoice.status !== 'PAID' && (
                        <div className="py-1">
                            {!invoice.isConverted && (
                                <button onClick={handleOpenShareModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    Send via Network
                                </button>
                            )}
                            
                            {isPro && (
                                <>
                                    <button onClick={handleOpenPaymentRequestModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Request Payment
                                    </button>
                                    <button onClick={handleOpenEmailModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Email Request
                                    </button>
                                    {invoice.status !== 'DRAFT' && (
                                        <button onClick={handleOpenReminderModal} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Send Reminder
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Management Actions */}
                    <div className="py-1">
                        {!invoice.isConverted && (
                            <Link href={`/dashboard/invoices/edit/${invoice.id}`} className="flex items-center px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={closeMenu}>
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Edit Invoice
                            </Link>
                        )}
                        
                        {isPro && !invoice.isConverted && invoice.status !== 'PAID' && (
                            <button onClick={() => handleAction('toggle-payment')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <svg className={clsx("mr-3 h-4 w-4", invoice.acceptOnlinePayment ? "text-[var(--text)]" : "text-[var(--muted)]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {invoice.acceptOnlinePayment ? "Disable Online Payments" : "Enable Online Payments"}
                            </button>
                        )}

                        {!invoice.isConverted && invoice.status !== 'PAID' && (
                            <button onClick={() => handleAction('mark-paid')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Mark as Paid
                            </button>
                        )}

                        {!invoice.isConverted && invoice.status === 'PAID' && (
                            <button onClick={() => handleAction('convert')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                Convert to Receipt
                            </button>
                        )}

                        {invoice.isConverted && (
                            <Link href={invoice.convertedReceiptId ? `/receipt/${invoice.convertedReceiptId}` : `/history`} className="flex items-center px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={closeMenu}>
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                View Receipt
                            </Link>
                        )}
                        
                        {invoice.status === 'PAID' && invoice.publicToken && (
                            <Link href={`/invoice/${invoice.publicToken}/bundle`} target="_blank" className="flex items-center px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={closeMenu}>
                                <svg className="mr-3 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Bundle
                            </Link>
                        )}

                        {!invoice.isConverted && invoice.status !== 'PAID' && (
                            <button onClick={() => handleAction('delete')} className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                <svg className="mr-3 h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Network Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                Send to Client Network
                            </h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-4 leading-relaxed">
                                Select a verified connection from your network to deploy this highly secure invoice to their private inbox instantly.
                            </p>
                            
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {isLoadingConnections ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : connections.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-black/20 rounded-xl ring-1 ring-black/5 dark:ring-white/5">
                                        <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium">No active connections found.</p>
                                        <p className="text-xs text-gray-400 dark:text-[var(--muted)]/50 mt-1">Connect with clients first to use this feature.</p>
                                    </div>
                                ) : (
                                    connections.map((conn) => (
                                        <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold flex-shrink-0 text-sm ring-1 ring-indigo-500/20">
                                                    {(conn.connectedUser.name || conn.connectedUser.email).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--text)] truncate">{conn.connectedUser.name || 'Unknown User'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-[var(--muted)] truncate">{conn.connectedUser.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                disabled={isSending}
                                                onClick={() => handleSendToClient(conn.connectedUser.id)}
                                                className="px-3 py-1.5 bg-white xl:bg-gray-100 dark:bg-black/40 hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors text-xs font-bold rounded-lg shadow-sm border border-gray-200 dark:border-white/10 disabled:opacity-50 break-keep flex-shrink-0"
                                            >
                                                {isSending ? 'Sending...' : 'Send'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Request Modal */}
            {isPaymentRequestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-amber-50/50 dark:bg-amber-500/10">
                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                Request Payment
                            </h3>
                            <button onClick={() => setIsPaymentRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-4 leading-relaxed">
                                Select a verified connection to send a secure, clickable payment request directly to their inbox.
                            </p>
                            
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {isLoadingConnections ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                                    </div>
                                ) : connections.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-black/20 rounded-xl ring-1 ring-black/5 dark:ring-white/5">
                                        <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium">No active connections found.</p>
                                    </div>
                                ) : (
                                    connections.map((conn) => (
                                        <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0 text-sm ring-1 ring-amber-500/20">
                                                    {(conn.connectedUser.name || conn.connectedUser.email).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-[var(--text)] truncate">{conn.connectedUser.name || 'Unknown User'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-[var(--muted)] truncate">{conn.connectedUser.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                disabled={isSending}
                                                onClick={() => handleSendPaymentRequest(conn.connectedUser.id)}
                                                className="px-3 py-1.5 bg-white xl:bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 hover:text-amber-700 text-amber-600 dark:text-amber-400 dark:hover:bg-amber-500/30 transition-colors text-xs font-bold rounded-lg shadow-sm border border-amber-200 dark:border-amber-500/30 disabled:opacity-50 break-keep flex-shrink-0"
                                            >
                                                {isSending ? 'Sending...' : 'Request'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Payment Request Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in text-left">
                    <form onSubmit={handleSendEmailRequest} className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-500/10">
                            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Email Payment Request
                            </h3>
                            <button type="button" onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Recipient Email *</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={emailRecipient} 
                                    onChange={(e) => setEmailRecipient(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-indigo-500/50" 
                                    placeholder="client@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Custom Message (Optional)</label>
                                <textarea 
                                    rows={3}
                                    value={customMessage} 
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" 
                                    placeholder="Add a personal note to the email..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-[var(--border)] flex justify-end gap-3">
                            <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-[var(--muted)] hover:text-gray-900 dark:hover:text-white" disabled={isSending}>Cancel</button>
                            <button type="submit" disabled={isSending} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2">
                                {isSending ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Send Reminder Modal */}
            {isReminderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in text-left">
                    <div className="bg-white dark:bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between bg-orange-50/50 dark:bg-orange-500/10">
                            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-500 flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Send Reminder
                            </h3>
                            <button type="button" onClick={() => setIsReminderModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text)] transition-colors p-1" disabled={isSending}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            
                            {invoice.paymentPlanEnabled && invoice.installments && invoice.installments.some(i => i.status !== 'PAID') && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Select Installment (Optional)</label>
                                    <select 
                                        value={selectedInstallmentId}
                                        onChange={(e) => setSelectedInstallmentId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                                    >
                                        <option value="">Full Remaining Balance</option>
                                        {invoice.installments.filter(i => i.status !== 'PAID').map(inst => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.label || 'Installment'} - ${inst.amount.toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-1">Custom Note (Optional)</label>
                                <textarea 
                                    rows={2}
                                    value={customMessage} 
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-sm" 
                                    placeholder="Add a note to the reminder..."
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)]">Send via Email</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="email" 
                                        value={emailRecipient} 
                                        onChange={(e) => setEmailRecipient(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" 
                                        placeholder="client@example.com"
                                    />
                                    <button 
                                        onClick={() => {
                                            if(!emailRecipient) return alert('Enter an email address');
                                            handleSendReminder('EMAIL', emailRecipient);
                                        }}
                                        disabled={isSending || !emailRecipient}
                                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-[var(--border)] pt-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-[var(--text)] mb-2">Or Send via Network</label>
                                <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {isLoadingConnections ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                                        </div>
                                    ) : connections.length === 0 ? (
                                        <p className="text-xs text-gray-500 dark:text-[var(--muted)] text-center py-4 bg-gray-50 dark:bg-black/20 rounded-lg">No active connections found.</p>
                                    ) : (
                                        connections.map((conn) => (
                                            <div key={conn.connectionId} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-[var(--border)] hover:border-orange-200 dark:hover:border-orange-500/30 transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                                                        {(conn.connectedUser.name || conn.connectedUser.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-[var(--text)] truncate">{conn.connectedUser.name || 'Unknown User'}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    disabled={isSending}
                                                    onClick={() => handleSendReminder('NETWORK', conn.connectedUser.id)}
                                                    className="px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 text-orange-600 dark:text-orange-400 dark:hover:bg-orange-500/30 transition-colors text-xs font-bold rounded-lg"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

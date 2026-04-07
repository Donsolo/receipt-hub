"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function InvoiceActions({ invoice }: { invoice: { id: string; status: string; isConverted: boolean; publicToken?: string | null; convertedReceiptId?: string | null } }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    // Sharing States
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [connections, setConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleAction = async (action: 'convert' | 'mark-paid' | 'delete') => {
        let confirmMsg = '';
        if (action === 'delete') confirmMsg = 'Are you sure you want to permanently delete this invoice?';
        if (action === 'convert') confirmMsg = 'Convert this PAID invoice to a permanent Receipt? This cannot be undone and will lock the invoice.';
        if (action === 'mark-paid') confirmMsg = 'Mark this invoice as PAID?';

        if (!window.confirm(confirmMsg)) return;

        setIsLoading(true);
        try {
            const endpoint = `/api/invoices/${invoice.id}${action === 'delete' ? '' : `/${action}`}`;
            const method = action === 'delete' ? 'DELETE' : 'POST';

            const res = await fetch(endpoint, { method });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to execute action.`);
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
        setIsLoading(true);
        try {
            const token = await getOrCreateToken();
            const link = `${window.location.origin}/invoice/${token}`;
            await navigator.clipboard.writeText(link);
            alert('Client Link Copied to Clipboard!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to copy link: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenShareModal = async () => {
        setIsShareModalOpen(true);
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

    return (
        <>
            <div className="flex items-center justify-center gap-2">
                
                {/* View Original Invoice */}
                {invoice.publicToken ? (
                    <Link href={`/invoice/${invoice.publicToken}`} target="_blank" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-500 bg-gray-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10 px-2.5 py-1 rounded-md transition-colors" title="View Original Invoice">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        <span className="hidden xl:inline">View</span>
                    </Link>
                ) : (
                    <button onClick={handleCopyLink} disabled={isLoading} className={clsx("transition-colors p-1", isLoading ? "cursor-not-allowed opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-blue-500")} title="Generate Link to View">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                )}

                {/* Send via Verihub Network */}
                {!invoice.isConverted && (
                    <button 
                        disabled={isLoading}
                        onClick={handleOpenShareModal} 
                        className={clsx("transition-colors p-1", isLoading ? "cursor-not-allowed opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-indigo-500")} 
                        title="Send to Client Network"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                )}

                {/* Copy Link */}
                <button 
                    disabled={isLoading}
                    onClick={handleCopyLink} 
                    className={clsx("transition-colors p-1", isLoading ? "cursor-not-allowed opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-blue-500")} 
                    title="Copy Public Client Link"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </button>

                {/* Edit (Locked if Converted) */}
                {!invoice.isConverted ? (
                    <Link href={`/dashboard/invoices/edit/${invoice.id}`} className={clsx("transition-colors p-1", isLoading ? "pointer-events-none opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-indigo-500")} title="Edit">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </Link>
                ) : null}

                {/* Mark Paid (Locked if Converted or already Paid) */}
                {!invoice.isConverted && invoice.status !== 'PAID' && (
                    <button 
                        disabled={isLoading}
                        onClick={() => handleAction('mark-paid')} 
                        className={clsx("transition-colors p-1", isLoading ? "cursor-not-allowed opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-emerald-500")} 
                        title="Mark Paid"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                )}

                {/* Convert to Receipt (Only if PAID and Not Converted) */}
                {!invoice.isConverted && invoice.status === 'PAID' && (
                    <button 
                        disabled={isLoading}
                        onClick={() => handleAction('convert')} 
                        className={clsx("transition-colors p-1", isLoading ? "cursor-not-allowed opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-blue-500")} 
                        title="Convert to Receipt"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </button>
                )}

                {/* View Converted Receipt (If already Converted) */}
                {invoice.isConverted && (
                    <Link href={invoice.convertedReceiptId ? `/receipt/${invoice.convertedReceiptId}` : `/history`} className="text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded transition-colors text-xs font-bold whitespace-nowrap" title="View in Receipt Hub">
                        View Receipt
                    </Link>
                )}

                {/* Convert Disabled State (If not Paid and not Converted) */}
                {!invoice.isConverted && invoice.status !== 'PAID' && (
                    <button disabled className="text-[var(--muted)]/30 cursor-not-allowed p-1 hidden sm:block" title="Invoice must be PAID to convert">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </button>
                )}

                {/* Delete */}
                {!invoice.isConverted && invoice.status !== 'PAID' && (
                    <button 
                        disabled={isLoading}
                        onClick={() => handleAction('delete')} 
                        className={clsx("transition-colors p-1", isLoading ? "cursor-not-allowed opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-red-500")} 
                        title="Delete"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                )}

            </div>

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
        </>
    );
}

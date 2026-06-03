"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import HeroSection from '@/components/ui/HeroSection';
import PageHeaderCard from '@/components/ui/PageHeaderCard';

export default function BillingCenterClient() {
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'installments' | 'receipts'>('incoming');
    const [incoming, setIncoming] = useState<any[]>([]);
    const [outgoing, setOutgoing] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            (async () => fetch(`${API_BASE_URL}/api/billing/incoming`, { headers: { ...((await getAuthHeader()) as any) } }))().then(res => res.json()),
            (async () => fetch(`${API_BASE_URL}/api/billing/outgoing`, { headers: { ...((await getAuthHeader()) as any) } }))().then(res => res.json()),
            (async () => fetch(`${API_BASE_URL}/api/billing/installments`, { headers: { ...((await getAuthHeader()) as any) } }))().then(res => res.json())
        ]).then(([incRes, outRes, instRes]) => {
            if (incRes.success) setIncoming(incRes.data);
            if (outRes.success) setOutgoing(outRes.data);
            if (instRes.success) setInstallments(instRes.data);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load billing data', err);
            setLoading(false);
        });
    }, []);

    const allInvoices = [...incoming, ...outgoing];
    const receipts = allInvoices.filter(inv => inv.status === 'PAID' || inv.paymentStatus === 'PAID');

    const renderInvoiceCard = (inv: any, type: 'incoming' | 'outgoing') => (
        <div key={inv.id} className="bg-white/60 dark:bg-[#11131F]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{type === 'incoming' ? inv.senderName : (inv.clientCompany || inv.clientName || 'Unknown Client')}</h4>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{inv.title}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-[var(--text)]">${inv.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide mt-0.5">Remaining</p>
                </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
                {inv.isOverdue && <span className="bg-red-500/10 text-red-500 text-xs px-2 py-0.5 rounded-md font-semibold">Overdue</span>}
                <span className={clsx("text-xs px-2 py-0.5 rounded-md font-semibold", 
                    inv.displayStatus === 'UNPAID' ? 'bg-amber-500/10 text-amber-500' : 
                    inv.displayStatus === 'PARTIAL' ? 'bg-blue-500/10 text-blue-500' : 
                    'bg-gray-500/10 text-gray-500'
                )}>
                    {inv.displayStatus}
                </span>
                {inv.dueDate && <span className="text-xs text-[var(--muted)]">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>}
            </div>
            <div className="flex gap-2">
                {type === 'incoming' ? (
                    <Link href={`/invoice/${inv.publicToken}`} className="flex-1 text-center bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                        Pay Now
                    </Link>
                ) : (
                    <Link href={`/invoice/${inv.publicToken}`} className="flex-1 text-center bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm font-semibold py-2 rounded-xl hover:bg-[var(--border)] transition-colors">
                        View
                    </Link>
                )}
            </div>
        </div>
    );

    const renderInstallmentCard = (inst: any) => (
        <div key={inst.id} className="bg-white/60 dark:bg-[#11131F]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className={clsx("text-[10px] font-bold uppercase px-2 py-0.5 rounded-md mb-2 inline-block", inst.direction === 'incoming' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500')}>
                        {inst.direction === 'incoming' ? 'You Owe' : 'To Collect'}
                    </span>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{inst.counterpartyName}</h4>
                    <p className="text-xs text-[var(--muted)]">{inst.invoiceTitle}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-[var(--text)]">${inst.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
            <div className="flex justify-between items-center text-xs mt-4">
                <span className={clsx("font-semibold", inst.status === 'PAID' ? 'text-emerald-500' : inst.status === 'OVERDUE' ? 'text-red-500' : 'text-amber-500')}>
                    {inst.status}
                </span>
                <span className="text-[var(--muted)]">Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            {inst.status !== 'PAID' && inst.direction === 'incoming' && (
                <Link href={`/invoice/${inst.invoiceToken}`} className="mt-4 block text-center bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                    Pay Installment
                </Link>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col">
            <HeroSection pageKey="dashboard" />
            
            <div className="p-4 sm:p-8 flex-1">
                <div className="max-w-5xl mx-auto space-y-6">
                    <PageHeaderCard 
                        title="Billing Center" 
                        description="Manage incoming invoices, outgoing payments, and installments in one place."
                    />

                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Sticky Tabs */}
                            <div className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md pt-2 pb-4 border-b border-[var(--border)] mb-6 overflow-x-auto hide-scrollbar">
                                <div className="flex gap-2 min-w-max">
                                    <button 
                                        onClick={() => setActiveTab('incoming')}
                                        className={clsx("px-5 py-2.5 rounded-full text-sm font-semibold transition-all", activeTab === 'incoming' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]')}
                                    >
                                        Incoming {incoming.filter(i => i.displayStatus !== 'PAID').length > 0 && `(${incoming.filter(i => i.displayStatus !== 'PAID').length})`}
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('outgoing')}
                                        className={clsx("px-5 py-2.5 rounded-full text-sm font-semibold transition-all", activeTab === 'outgoing' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]')}
                                    >
                                        Outgoing
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('installments')}
                                        className={clsx("px-5 py-2.5 rounded-full text-sm font-semibold transition-all", activeTab === 'installments' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]')}
                                    >
                                        Installments
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('receipts')}
                                        className={clsx("px-5 py-2.5 rounded-full text-sm font-semibold transition-all", activeTab === 'receipts' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]')}
                                    >
                                        Receipts
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {activeTab === 'incoming' && (
                                    incoming.filter(i => i.displayStatus !== 'PAID').length > 0 
                                        ? incoming.filter(i => i.displayStatus !== 'PAID').map(inv => renderInvoiceCard(inv, 'incoming'))
                                        : <div className="col-span-full py-12 text-center text-[var(--muted)]">You have no unpaid incoming invoices.</div>
                                )}
                                
                                {activeTab === 'outgoing' && (
                                    outgoing.filter(i => i.displayStatus !== 'PAID').length > 0 
                                        ? outgoing.filter(i => i.displayStatus !== 'PAID').map(inv => renderInvoiceCard(inv, 'outgoing'))
                                        : <div className="col-span-full py-12 text-center text-[var(--muted)]">You have no unpaid outgoing invoices.</div>
                                )}

                                {activeTab === 'installments' && (
                                    installments.length > 0
                                        ? installments.map(inst => renderInstallmentCard(inst))
                                        : <div className="col-span-full py-12 text-center text-[var(--muted)]">No active installments.</div>
                                )}

                                {activeTab === 'receipts' && (
                                    receipts.length > 0
                                        ? receipts.map(inv => (
                                            <div key={inv.id} className="bg-white/60 dark:bg-[#11131F]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-5 shadow-sm opacity-80">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-[var(--text)]">{inv.title}</h4>
                                                        <p className="text-xs text-[var(--muted)]">{inv.senderName || inv.clientName || 'Unknown'}</p>
                                                    </div>
                                                    <span className="text-emerald-500 bg-emerald-500/10 text-[10px] font-bold px-2 py-0.5 rounded-md">PAID</span>
                                                </div>
                                                <p className="text-lg font-bold text-[var(--text)] my-3">${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                {inv.convertedReceiptId ? (
                                                    <Link href={`/receipt/${inv.convertedReceiptId}`} className="text-indigo-500 text-sm font-semibold hover:underline">View Receipt</Link>
                                                ) : (
                                                    <Link href={`/invoice/${inv.publicToken}`} className="text-indigo-500 text-sm font-semibold hover:underline">View Invoice</Link>
                                                )}
                                            </div>
                                        ))
                                        : <div className="col-span-full py-12 text-center text-[var(--muted)]">No paid receipts found.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

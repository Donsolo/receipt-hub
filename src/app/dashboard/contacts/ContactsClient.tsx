'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function ContactsClient({ initialContacts, tags, isPro }: { initialContacts: any[], tags: any[], isPro: boolean }) {
    const [search, setSearch] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filteredContacts = useMemo(() => {
        return initialContacts.filter(c => {
            // Search
            const s = search.toLowerCase();
            const matchesSearch = !s || 
                (c.name?.toLowerCase().includes(s) || 
                 c.email?.toLowerCase().includes(s) || 
                 c.phone?.toLowerCase().includes(s) || 
                 c.company?.toLowerCase().includes(s));
            
            if (!matchesSearch) return false;

            // Tag Filter
            if (tagFilter) {
                const hasTag = c.tags.some((t: any) => t.tagId === tagFilter);
                if (!hasTag) return false;
            }

            // Status Filter
            if (statusFilter) {
                let outstanding = 0;
                let overdue = 0;
                const today = new Date();

                c.invoices.forEach((inv: any) => {
                    const payments = Array.isArray(inv.payments) ? inv.payments : [];
                    const pTotal = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                    const instTotal = (inv.installments || []).filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.amount, 0);
                    const paid = Math.max(pTotal, instTotal);
                    const bal = Math.max(0, inv.total - paid);
                    outstanding += bal;
                    if (bal > 0 && inv.dueDate && new Date(inv.dueDate) < today) {
                        overdue += bal;
                    }
                });

                if (statusFilter === 'unpaid' && outstanding === 0) return false;
                if (statusFilter === 'overdue' && overdue === 0) return false;
            }

            return true;
        });
    }, [initialContacts, search, tagFilter, statusFilter]);

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Contacts</h1>
                    <p className="text-gray-500 dark:text-[var(--muted)] mt-2">Manage your customers and clients.</p>
                </div>
                
                {isPro && (
                    <Link 
                        href="/dashboard/contacts/import" 
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Import CSV
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#0b1220] p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/10 mb-6 flex flex-col md:flex-row gap-4">
                <input 
                    type="text" 
                    placeholder="Search name, email, or phone..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select 
                    value={tagFilter} 
                    onChange={e => setTagFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Tags</option>
                    {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Statuses</option>
                    <option value="unpaid">Has Unpaid Balance</option>
                    <option value="overdue">Has Overdue Invoices</option>
                </select>
            </div>

            <div className="bg-white dark:bg-[#0b1220] rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                {filteredContacts.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No contacts found</h3>
                        <p className="text-gray-500 dark:text-[var(--muted)] mt-1 mb-6">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contact Info</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/10">
                                {filteredContacts.map(contact => (
                                    <tr key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                        <td className="px-6 py-4">
                                            <Link href={`/dashboard/contacts/${contact.id}`} className="font-bold text-gray-900 dark:text-white hover:text-indigo-500 hover:underline">
                                                {contact.name || 'Unnamed'}
                                            </Link>
                                            {contact.company && <div className="text-xs text-gray-500 dark:text-[var(--muted)]">{contact.company}</div>}
                                            <div className="sm:hidden text-xs text-gray-500 mt-1">{contact.email || contact.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <div className="text-sm text-gray-900 dark:text-white">{contact.email}</div>
                                            <div className="text-xs text-gray-500 dark:text-[var(--muted)]">{contact.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {contact.tags.map((t: any) => (
                                                    <span key={t.tagId} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider">
                                                        {t.tag.name}
                                                    </span>
                                                ))}
                                                {contact.tags.length === 0 && <span className="text-gray-400 text-xs italic">No tags</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

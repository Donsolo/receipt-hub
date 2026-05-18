'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCampaignClient({ contacts, tags }: { contacts: any[], tags: any[] }) {
    const router = useRouter();
    
    // Form state
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [contentText, setContentText] = useState('');
    
    // Filter state for audience
    const [tagFilter, setTagFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

    // Filter logic
    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            if (!c.email) return false; // MUST have email

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
                    if (bal > 0 && inv.dueDate && new Date(inv.dueDate) < today) overdue += bal;
                });

                if (statusFilter === 'unpaid' && outstanding === 0) return false;
                if (statusFilter === 'overdue' && overdue === 0) return false;
            }

            return true;
        });
    }, [contacts, tagFilter, statusFilter]);

    const handleSelectAll = () => {
        if (selectedContactIds.size === filteredContacts.length) {
            setSelectedContactIds(new Set());
        } else {
            const newSet = new Set<string>();
            filteredContacts.forEach(c => newSet.add(c.id));
            setSelectedContactIds(newSet);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedContactIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedContactIds(newSet);
    };

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name || !subject || !contentText) {
            setError('Name, Subject, and Content are required.');
            return;
        }
        if (selectedContactIds.size === 0) {
            setError('Please select at least one recipient.');
            return;
        }
        if (selectedContactIds.size > 500) {
            setError('Campaigns are limited to 500 recipients.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    subject,
                    previewText,
                    contentText,
                    contactIds: Array.from(selectedContactIds)
                })
            });

            const data = await res.json();
            if (res.ok) {
                router.push(`/dashboard/campaigns/${data.campaign.id}`);
            } else {
                setError(data.error || 'Failed to create campaign');
                setSaving(false);
            }
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 font-sans">
            <Link href="/dashboard/campaigns" className="text-sm font-bold text-indigo-500 hover:underline mb-6 inline-block">&larr; Back to Campaigns</Link>
            
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">New Campaign Draft</h1>
            
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-8 flex gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-bold mb-1">Strict Anti-Spam Policy Enforced</p>
                    <p>Use campaigns only for customers who explicitly expect to hear from your business. Sending unsolicited spam will result in immediate account termination. Campaigns are capped at 500 recipients per send with a 15-minute global cooldown.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 font-bold border border-red-100">
                    {error}
                </div>
            )}

            <div className="space-y-8">
                {/* 1. Basic Info */}
                <section className="bg-white dark:bg-[#0b1220] p-6 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">1. Campaign Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Internal Name</label>
                            <input 
                                type="text" 
                                value={name} onChange={e => setName(e.target.value)}
                                placeholder="e.g. Holiday Promo, Overdue Notice"
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Subject Line</label>
                            <input 
                                type="text" 
                                value={subject} onChange={e => setSubject(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Preview Text (Optional)</label>
                            <input 
                                type="text" 
                                value={previewText} onChange={e => setPreviewText(e.target.value)}
                                placeholder="A short snippet that appears next to the subject in the inbox"
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Message Body (Text)</label>
                            <textarea 
                                value={contentText} onChange={e => setContentText(e.target.value)}
                                placeholder="Write your email content here..."
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[200px]"
                            />
                            <p className="text-xs text-gray-500 mt-2">Line breaks will be preserved. HTML layout will be added automatically.</p>
                        </div>
                    </div>
                </section>

                {/* 2. Audience Selection */}
                <section className="bg-white dark:bg-[#0b1220] p-6 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">2. Select Audience</h2>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <select 
                            value={tagFilter} 
                            onChange={e => { setTagFilter(e.target.value); setSelectedContactIds(new Set()); }}
                            className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Filter by Tag (All)</option>
                            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={e => { setStatusFilter(e.target.value); setSelectedContactIds(new Set()); }}
                            className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Filter by Invoice Status (All)</option>
                            <option value="unpaid">Has Unpaid Balance</option>
                            <option value="overdue">Has Overdue Invoices</option>
                        </select>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {filteredContacts.length} available matching contacts.
                        </div>
                        <button onClick={handleSelectAll} className="text-sm text-indigo-600 font-bold hover:underline">
                            {selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0 ? 'Deselect All' : 'Select All Filtered'}
                        </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto border border-gray-100 dark:border-white/5 rounded-lg divide-y divide-gray-100 dark:divide-white/5">
                        {filteredContacts.map(c => (
                            <label key={c.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={selectedContactIds.has(c.id)}
                                    onChange={() => handleToggleSelect(c.id)}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-900 dark:text-white">{c.name || 'Unnamed'}</div>
                                    <div className="text-xs text-gray-500">{c.email}</div>
                                </div>
                            </label>
                        ))}
                        {filteredContacts.length === 0 && <div className="p-4 text-center text-sm text-gray-500">No contacts with emails match these filters.</div>}
                    </div>
                </section>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-white/[0.02] p-6 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="text-sm">
                        <span className="font-bold text-gray-900 dark:text-white">{selectedContactIds.size}</span> recipients selected (Max 500)
                    </div>
                    <button 
                        onClick={handleCreate} 
                        disabled={saving || selectedContactIds.size === 0}
                        className="px-6 py-3 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all"
                    >
                        {saving ? 'Creating...' : 'Create Draft & Continue &rarr;'}
                    </button>
                </div>
            </div>
        </div>
    );
}

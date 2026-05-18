'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { use } from 'react';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [contact, setContact] = useState<any>(null);
    const [tags, setTags] = useState<any[]>([]);
    const [allTags, setAllTags] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [newNote, setNewNote] = useState('');
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/contacts/${id}`).then(res => res.json()),
            fetch(`/api/contacts/${id}/activity`).then(res => res.json()),
            fetch(`/api/tags`).then(res => res.json()) // Load all tags for dropdown
        ])
        .then(([contactData, activityData, tagsData]) => {
            if (contactData.error) throw new Error(contactData.error);
            setContact(contactData.contact);
            setTags(contactData.contact.tags?.map((t: any) => t.tag) || []);
            setNotes(contactData.contact.notesArray || []);
            setActivity(activityData.events || []);
            setAllTags(tagsData.tags || []);
            
            // Compute Health Metrics
            const invoices = contactData.contact.invoices || [];
            let totalSpent = 0;
            let outstanding = 0;
            let overdueCount = 0;
            let paidCount = 0;

            const today = new Date();

            invoices.forEach((inv: any) => {
                const payments = Array.isArray(inv.payments) ? inv.payments : [];
                const pTotal = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                const instTotal = (inv.installments || []).filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.amount, 0);
                const paid = Math.max(pTotal, instTotal);
                const bal = Math.max(0, inv.total - paid);

                totalSpent += paid;
                outstanding += bal;

                if (bal === 0) paidCount++;
                if (bal > 0 && inv.dueDate && new Date(inv.dueDate) < today) overdueCount++;
            });

            setMetrics({
                totalSpent,
                outstanding,
                invoiceCount: invoices.length,
                paidCount,
                overdueCount,
                status: outstanding > 0 ? (overdueCount > 0 ? 'Overdue' : 'Active') : 'Good Standing'
            });

        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [id]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            const res = await fetch(`/api/contacts/${id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNote })
            });
            const data = await res.json();
            if (data.success) {
                setNotes([data.note, ...notes]);
                setNewNote('');
                // Optionally push to activity timeline locally to avoid refetch
                setActivity([{
                    id: `note_${data.note.id}`,
                    type: 'NOTE_ADDED',
                    title: 'Note Added',
                    description: data.note.content,
                    timestamp: data.note.createdAt,
                    icon: 'document'
                }, ...activity]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Delete this note?')) return;
        try {
            const res = await fetch(`/api/contacts/${id}/notes/${noteId}`, { method: 'DELETE' });
            if (res.ok) {
                setNotes(notes.filter(n => n.id !== noteId));
                setActivity(activity.filter(a => a.id !== `note_${noteId}`));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddTag = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tagId = e.target.value;
        if (!tagId) return;
        try {
            const res = await fetch(`/api/contacts/${id}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagId })
            });
            if (res.ok) {
                const tag = allTags.find(t => t.id === tagId);
                if (tag && !tags.find(t => t.id === tagId)) {
                    setTags([...tags, tag]);
                }
            }
        } catch (err) {
            console.error(err);
        }
        e.target.value = ''; // reset select
    };

    const handleRemoveTag = async (tagId: string) => {
        try {
            const res = await fetch(`/api/contacts/${id}/tags/${tagId}`, { method: 'DELETE' });
            if (res.ok) {
                setTags(tags.filter(t => t.id !== tagId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 max-w-6xl mx-auto animate-pulse">Loading Contact...</div>;
    if (error) return <div className="p-8 max-w-6xl mx-auto text-red-500">{error}</div>;
    if (!contact) return null;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 font-sans">
            <Link href="/dashboard/contacts" className="text-sm font-bold text-indigo-500 hover:underline mb-6 inline-block">&larr; Back to Contacts</Link>
            
            {/* Header */}
            <div className="bg-white dark:bg-[#0b1220] rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{contact.name || contact.email || contact.phone}</h1>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-[var(--muted)]">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.phone && <span>{contact.phone}</span>}
                        {contact.company && <span>{contact.company}</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {tags.map(t => (
                        <span key={t.id} className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-2">
                            {t.name}
                            <button onClick={() => handleRemoveTag(t.id)} className="text-gray-400 hover:text-red-500">&times;</button>
                        </span>
                    ))}
                    <select onChange={handleAddTag} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full outline-none appearance-none cursor-pointer">
                        <option value="">+ Add Tag</option>
                        {allTags.filter(t => !tags.find(ct => ct.id === t.id)).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Health Insights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-[#0b1220] p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Lifetime Value</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${metrics?.totalSpent?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="bg-white dark:bg-[#0b1220] p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Outstanding</div>
                    <div className={`text-2xl font-black ${metrics?.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>${metrics?.outstanding?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="bg-white dark:bg-[#0b1220] p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Invoices</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{metrics?.invoiceCount || 0}</div>
                </div>
                <div className="bg-white dark:bg-[#0b1220] p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{metrics?.status || 'Unknown'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Notes & Details */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-[#0b1220] p-6 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">CRM Notes</h2>
                        <div className="mb-4">
                            <textarea 
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                placeholder="Add a note about this customer..."
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                            />
                            <button onClick={handleAddNote} className="mt-2 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors">
                                Save Note
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {notes.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No notes yet.</p>}
                            {notes.map(note => (
                                <div key={note.id} className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl group relative">
                                    <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</div>
                                    <div className="text-xs text-gray-400 mt-2">{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</div>
                                    <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-[#0b1220] p-6 sm:p-8 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Activity Timeline</h2>
                        
                        <div className="relative border-l-2 border-gray-100 dark:border-white/5 ml-3 space-y-8">
                            {activity.length === 0 && <p className="text-sm text-gray-500 italic pl-6">No activity recorded yet.</p>}
                            {activity.map((item, i) => (
                                <div key={item.id + i} className="relative pl-8">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-[#0b1220] border-2 border-indigo-500"></div>
                                    
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

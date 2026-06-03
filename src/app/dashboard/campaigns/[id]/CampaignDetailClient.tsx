import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function CampaignDetailClient({ campaign }: { campaign: any }) {
    const router = useRouter();
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSend = async () => {
        if (!confirm('Are you sure you want to send this campaign to all selected recipients?')) return;
        setSending(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaign.id}/send`, { headers: { ...((await getAuthHeader()) as any) }, method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSuccess(`Campaign successfully sent to ${data.successCount} recipients.`);
                // Refresh the page
                router.refresh();
            } else {
                setError(data.error || 'Failed to send campaign');
                setSending(false);
            }
        } catch (err: any) {
            setError(err.message);
            setSending(false);
        }
    };

    const isSent = campaign.status === 'SENT' || campaign.status === 'SENDING';
    const sentCount = campaign.recipients.filter((r: any) => r.status === 'SENT').length;
    const failedCount = campaign.recipients.filter((r: any) => r.status === 'FAILED').length;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 font-sans">
            <Link href="/dashboard/campaigns" className="text-sm font-bold text-indigo-500 hover:underline mb-6 inline-block">&larr; Back to Campaigns</Link>
            
            <div className="bg-white dark:bg-[#0b1220] rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{campaign.name}</h1>
                    <div className="text-sm text-gray-500 dark:text-[var(--muted)] mt-1">
                        Created {format(new Date(campaign.createdAt), 'MMM d, yyyy h:mm a')}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 text-sm font-bold rounded-lg uppercase tracking-wider ${campaign.status === 'SENT' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : campaign.status === 'DRAFT' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400' : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}`}>
                        {campaign.status}
                    </span>
                    {!isSent && (
                        <button 
                            onClick={handleSend}
                            disabled={sending}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {sending ? 'Sending...' : 'Send Campaign'}
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 font-bold border border-red-100">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-8 font-bold border border-emerald-100">{success}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Analytics & Recipients */}
                <div className="lg:col-span-1 space-y-8">
                    {isSent && (
                        <div className="bg-white dark:bg-[#0b1220] p-6 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Analytics</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-xl">
                                    <div className="text-2xl font-black text-emerald-600">{sentCount}</div>
                                    <div className="text-xs font-bold text-gray-500 uppercase">Delivered</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-xl">
                                    <div className="text-2xl font-black text-red-500">{failedCount}</div>
                                    <div className="text-xs font-bold text-gray-500 uppercase">Bounced</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-[#0b1220] p-6 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recipients</h2>
                            <span className="text-sm font-bold text-gray-500">{campaign.recipients.length} total</span>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {campaign.recipients.map((r: any) => (
                                <div key={r.id} className="text-sm flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">{r.customerContact.name || 'Unnamed'}</div>
                                        <div className="text-xs text-gray-500">{r.email}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${r.status === 'SENT' ? 'text-emerald-600 bg-emerald-50' : r.status === 'FAILED' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'}`}>
                                        {r.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Email Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-[#0b1220] p-6 sm:p-8 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Email Preview</h2>
                        
                        <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 dark:bg-black/20 px-4 py-3 border-b border-gray-200 dark:border-white/10">
                                <div className="text-sm mb-1"><span className="font-bold text-gray-500 uppercase">Subject:</span> <span className="text-gray-900 dark:text-white font-bold">{campaign.subject}</span></div>
                                {campaign.previewText && <div className="text-xs"><span className="font-bold text-gray-500 uppercase">Preview:</span> <span className="text-gray-600 dark:text-gray-400">{campaign.previewText}</span></div>}
                            </div>
                            <div className="p-6 bg-white dark:bg-black/10 min-h-[300px]">
                                {campaign.contentHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: campaign.contentHtml }} className="prose dark:prose-invert max-w-none text-sm" />
                                ) : (
                                    <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{campaign.contentText}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

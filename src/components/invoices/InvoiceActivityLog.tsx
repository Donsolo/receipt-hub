"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type ActivityLog = {
    id: string;
    channel: string;
    action: string;
    status: string;
    recipientEmail?: string;
    recipientUserId?: string;
    createdAt: string;
};

export default function InvoiceActivityLog({ invoiceId }: { invoiceId: string }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/activity`, { headers: { ...((await getAuthHeader()) as any) } });
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data.logs);
                }
            } catch (e) {
                console.error('Failed to fetch activity logs', e);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [invoiceId]);

    if (loading) {
        return <div className="text-sm text-[var(--muted)] animate-pulse">Loading activity...</div>;
    }

    if (logs.length === 0) {
        return null; // Hide completely if no activity
    }

    return (
        <div className="mt-8 border-t border-[var(--border)] pt-8 max-w-4xl mx-auto">
            <h3 className="text-lg font-bold text-[var(--text)] mb-4">Payment Request Activity</h3>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <ul className="divide-y divide-[var(--border)]">
                    {logs.map(log => {
                        let icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
                        let colorClass = "text-blue-500 bg-blue-500/10";
                        
                        if (log.channel === 'EMAIL') {
                            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
                            colorClass = "text-indigo-500 bg-indigo-500/10";
                        } else if (log.channel === 'NETWORK') {
                            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
                            colorClass = "text-purple-500 bg-purple-500/10";
                        }

                        let message = "";
                        if (log.action === 'LINK_COPIED') message = "Payment link copied to clipboard";
                        if (log.action === 'REQUEST_SENT') message = `Payment request sent via ${log.channel === 'EMAIL' ? 'email to ' + log.recipientEmail : 'Verihub Network'}`;
                        if (log.action === 'REMINDER_SENT') message = `Payment reminder sent via ${log.channel === 'EMAIL' ? 'email to ' + log.recipientEmail : 'Verihub Network'}`;

                        if (log.status === 'FAILED') colorClass = "text-red-500 bg-red-500/10";
                        if (log.status === 'BLOCKED') colorClass = "text-orange-500 bg-orange-500/10";

                        return (
                            <li key={log.id} className="p-4 flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                                    {icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-sm font-medium text-[var(--text)]">
                                            {message}
                                        </p>
                                        <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {log.status !== 'SENT' && (
                                        <p className="text-xs font-bold mt-1 uppercase" style={{ color: log.status === 'FAILED' ? 'rgb(239 68 68)' : 'rgb(249 115 22)' }}>
                                            {log.status}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

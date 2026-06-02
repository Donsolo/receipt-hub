import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';

// export const dynamic stripped by mobile build

export default async function CampaignsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) redirect('/login');

    const owner = await db.user.findUnique({ where: { id: authUser.userId } });
    const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';

    if (!isPro) {
        return (
            <div className="max-w-6xl mx-auto p-8 text-center">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Bulk Email Campaigns</h1>
                <p className="text-gray-500 mb-6">Bulk campaigns are a Pro-only feature.</p>
                <Link href="/dashboard/upgrade" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all">
                    Upgrade to Pro
                </Link>
            </div>
        );
    }

    const campaigns = await db.customerEmailCampaign.findMany({
        where: { ownerId: authUser.userId },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Campaigns</h1>
                    <p className="text-gray-500 dark:text-[var(--muted)] mt-2">Send bulk email updates and payment reminders.</p>
                </div>
                
                <Link 
                    href="/dashboard/campaigns/new" 
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    New Campaign
                </Link>
            </div>

            <div className="bg-white dark:bg-[#0b1220] rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                {campaigns.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No campaigns yet</h3>
                        <p className="text-gray-500 dark:text-[var(--muted)] mt-1 mb-6">Create your first bulk email campaign to engage your customers.</p>
                        <Link href="/dashboard/campaigns/new" className="text-indigo-600 font-bold hover:underline">Create Campaign &rarr;</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Campaign Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Recipients</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/10">
                                {campaigns.map(camp => (
                                    <tr key={camp.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                        <td className="px-6 py-4">
                                            <Link href={`/dashboard/campaigns/${camp.id}`} className="font-bold text-gray-900 dark:text-white hover:text-indigo-500 hover:underline block">
                                                {camp.name}
                                            </Link>
                                            <div className="text-xs text-gray-500 dark:text-[var(--muted)] mt-1">{camp.subject}</div>
                                            <div className="sm:hidden mt-2">
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wider ${camp.status === 'SENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>{camp.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${camp.status === 'SENT' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : camp.status === 'DRAFT' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400' : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}`}>
                                                {camp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{camp.recipientCount}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[var(--muted)]">
                                            {format(new Date(camp.createdAt), 'MMM d, yyyy')}
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

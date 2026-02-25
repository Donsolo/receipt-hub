import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { getReceipts } from '@/lib/actions';
import { CURRENT_CHANGELOG_VERSION } from '@/lib/constants';
import ChangeLogModal from './ChangeLogModal';

export const dynamic = "force-dynamic";

export default async function Dashboard() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        return <div>Unauthorized</div>;
    }

    // Fetch user details for the greeting
    const user = await db.user.findUnique({
        where: { id: authUser.userId },
        select: { email: true, lastSeenChangelogVersion: true, isEarlyAccess: true, ...({ name: true, businessName: true } as any) }
    }) as any;

    const showChangelog = user?.lastSeenChangelogVersion !== CURRENT_CHANGELOG_VERSION;

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

    // Fetch receipts for stats
    const receipts = await getReceipts("");

    // --- Smart Greeting Logic ---
    const currentHour = new Date().getHours();
    let timeGreeting = "Good evening";
    if (currentHour >= 5 && currentHour < 12) {
        timeGreeting = "Good morning";
    } else if (currentHour >= 12 && currentHour < 17) {
        timeGreeting = "Good afternoon";
    }

    let displayName = "";
    if (user?.businessName) {
        displayName = user.businessName;
    } else if (user?.name) {
        displayName = user.name;
    }

    // --- Stats Logic ---
    const totalReceipts = receipts.length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthReceipts = receipts.filter(r => new Date(r.createdAt) >= startOfMonth).length;

    let lastActivityStr = "No activity yet";
    let relativeTimeStr = "";
    if (totalReceipts > 0 && receipts[0].createdAt) {
        const lastDate = new Date(receipts[0].createdAt);
        lastActivityStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Calculate relative time
        const diffInDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffInDays === 0) relativeTimeStr = "Today";
        else if (diffInDays === 1) relativeTimeStr = "Yesterday";
        else relativeTimeStr = `${diffInDays} days ago`;
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Changelog Modal */}
                {showChangelog && <ChangeLogModal version={CURRENT_CHANGELOG_VERSION} />}

                {/* Greeting Section */}
                <div className="mt-2 mb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h1 className="text-2xl sm:text-3xl font-normal text-[var(--text)] tracking-tight flex gap-2">
                            <span>{timeGreeting},</span>
                            {displayName ? <span className="font-semibold">{displayName}.</span> : <span>.</span>}
                        </h1>
                        {user?.isEarlyAccess && !isPro && (
                            <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 mt-1 sm:mt-0">
                                Core (Early Access Founder)
                            </span>
                        )}
                        {isPro && (
                            <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 mt-1 sm:mt-0 shadow-sm shadow-yellow-500/10">
                                PRO
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-sm text-[var(--muted)]">Here’s your receipt workspace.</p>
                        {!isPro && (
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--muted)] text-xs">•</span>
                                <Link href="/upgrade" className="text-xs text-yellow-500/80 hover:text-yellow-400 transition-colors flex items-center gap-1 group">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    Professional Mode Available
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats Strip */}
                <div className={`bg-[var(--bg)] border ${isPro ? 'border-yellow-500/20 shadow-sm shadow-yellow-500/5' : 'border-[var(--border)]'} rounded-xl flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/5 overflow-hidden mb-6 transition-all`}>
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center hover:bg-[var(--card-hover)] transition-colors">
                        <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">Total Receipts</span>
                        <span className="text-2xl font-semibold text-[var(--text)]">{totalReceipts}</span>
                    </div>
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center hover:bg-[var(--card-hover)] transition-colors">
                        <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">Receipts This Month</span>
                        <span className="text-2xl font-semibold text-[var(--text)]">{thisMonthReceipts}</span>
                    </div>
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center hover:bg-[var(--card-hover)] transition-colors relative">
                        <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">Last Activity</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-medium text-[var(--text)]">{lastActivityStr}</span>
                            {relativeTimeStr && <span className="text-[11px] text-[var(--muted)]">{relativeTimeStr}</span>}
                        </div>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Receipts */}
                    <Link href="/history" className="block group h-full">
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl px-5 py-6 hover:bg-[var(--card-hover)] hover:-translate-y-1 hover:shadow-lg shadow-md transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-start gap-4 mb-2 relative z-10">
                                <div className="h-12 w-12 shrink-0 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors shadow-inner border border-blue-500/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 pt-1.5">
                                    <h2 className="text-[16px] font-semibold text-[var(--text)] group-hover:text-[var(--text)] transition-colors tracking-tight">Receipt Hub</h2>
                                    <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Create, upload, manage, and share all of your business receipts in the vault.</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Business Network */}
                    <Link href="/dashboard/connections" className="block group h-full">
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl px-5 py-6 hover:bg-[var(--card-hover)] hover:-translate-y-1 hover:shadow-lg shadow-md transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-start gap-4 mb-2 relative z-10">
                                <div className="h-12 w-12 shrink-0 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-colors shadow-inner border border-teal-500/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 pt-1.5">
                                    <h2 className="text-[16px] font-semibold text-[var(--text)] group-hover:text-[var(--text)] transition-colors tracking-tight">Business Network</h2>
                                    <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Connect and securely message other verified early-access founders.</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Submit Feedback */}
                    <Link href="/feedback" className="block group h-full">
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl px-5 py-6 hover:bg-[var(--card-hover)] hover:-translate-y-1 hover:shadow-lg shadow-md transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-start gap-4 mb-2 relative z-10">
                                <div className="h-12 w-12 shrink-0 bg-fuchsia-500/10 rounded-xl flex items-center justify-center text-fuchsia-400 group-hover:bg-fuchsia-500/20 transition-colors shadow-inner border border-fuchsia-500/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <div className="flex-1 pt-1.5">
                                    <h2 className="text-[16px] font-semibold text-[var(--text)] group-hover:text-[var(--text)] transition-colors tracking-tight">Submit Feedback</h2>
                                    <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">Help shape the future of Receipt Hub. Share ideas or report any bugs you find.</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}

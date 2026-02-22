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
        <div className="min-h-screen bg-[#0B1220] p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Changelog Modal */}
                {showChangelog && <ChangeLogModal version={CURRENT_CHANGELOG_VERSION} />}

                {/* Greeting Section */}
                <div className="mt-2 mb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h1 className="text-2xl sm:text-3xl font-normal text-gray-100 tracking-tight flex gap-2">
                            <span>{timeGreeting},</span>
                            {displayName ? <span className="font-semibold">{displayName}.</span> : <span>.</span>}
                        </h1>
                        {user?.isEarlyAccess && (
                            <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 mt-1 sm:mt-0">
                                Core (Early Access Founder)
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Here’s your receipt workspace.</p>
                </div>

                {/* Quick Stats Strip */}
                <div className="bg-[#0F172A] border border-white/5 rounded-xl flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/5 overflow-hidden shadow-sm mb-6">
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center hover:bg-white/[0.02] transition-colors">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Total Receipts</span>
                        <span className="text-2xl font-semibold text-gray-100">{totalReceipts}</span>
                    </div>
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center hover:bg-white/[0.02] transition-colors">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Receipts This Month</span>
                        <span className="text-2xl font-semibold text-gray-100">{thisMonthReceipts}</span>
                    </div>
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center hover:bg-white/[0.02] transition-colors relative">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Last Activity</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-medium text-gray-100">{lastActivityStr}</span>
                            {relativeTimeStr && <span className="text-[11px] text-gray-400">{relativeTimeStr}</span>}
                        </div>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Row 1, Col 1: Create Receipt (Primary) */}
                    <Link href="/create" className="block group h-full">
                        <div className="bg-[#141E33] border border-indigo-500/30 rounded-xl px-5 py-6 sm:px-6 hover:bg-[#182339] hover:border-indigo-500/50 hover:-translate-y-0.5 hover:shadow-lg shadow-md shadow-black/20 h-full flex flex-col justify-center transition-all duration-150">
                            <div className="flex items-center gap-3 mb-3.5">
                                <div className="h-10 w-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/30 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <h2 className="text-[16px] font-semibold text-gray-100 group-hover:text-white transition-colors">Create Receipt</h2>
                            </div>
                            <p className="text-[13px] text-indigo-200/60 leading-relaxed pr-2">
                                Generate a professional PDF receipt using the form generator with automatic calculation.
                            </p>
                        </div>
                    </Link>

                    {/* Row 1, Col 2: Upload Receipt */}
                    <Link href="/uploads" className="block group h-full">
                        <div className="bg-[#0F172A] border border-white/5 rounded-xl px-5 py-6 sm:px-6 hover:bg-[#111A2C] hover:-translate-y-0.5 hover:shadow-lg shadow-sm h-full flex flex-col justify-center transition-all duration-150">
                            <div className="flex items-center gap-3 mb-3.5">
                                <div className="h-9 w-9 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <h2 className="text-[15px] font-medium text-gray-200 group-hover:text-gray-100 transition-colors">Upload Receipt</h2>
                            </div>
                            <p className="text-[13px] text-gray-500 leading-relaxed pr-2">
                                Upload a photo or scan of an existing receipt for safe storage and later retrieval.
                            </p>
                        </div>
                    </Link>

                    {/* Row 2: Receipt History (Full Width) */}
                    <Link href="/history" className="block group md:col-span-2">
                        <div className="bg-[#0F172A] border border-white/5 rounded-xl px-5 py-5 sm:px-6 sm:py-6 hover:bg-[#111A2C] hover:-translate-y-0.5 hover:shadow-lg shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-medium text-gray-200 group-hover:text-gray-100 transition-colors">Receipt History</h2>
                                    <p className="text-[12px] text-gray-500 mt-1">View, manage, and search all your generated and uploaded receipts.</p>
                                </div>
                            </div>
                            <div className="text-gray-500 group-hover:text-gray-300 transition-transform duration-150 group-hover:translate-x-1 sm:pr-2 hidden sm:block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>

                    {/* Row 3: Submit Feedback (Full Width) */}
                    <Link href="/feedback" className="block group md:col-span-2 mt-4">
                        <div className="bg-[#0F172A] border border-white/5 rounded-xl px-5 py-4 sm:px-6 sm:py-5 hover:bg-[#111A2C] hover:-translate-y-0.5 hover:shadow-lg shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-fuchsia-500/10 rounded-lg flex items-center justify-center text-fuchsia-400 group-hover:bg-fuchsia-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-medium text-gray-200 group-hover:text-gray-100 transition-colors">Submit Feedback</h2>
                                    <p className="text-[12px] text-gray-500 mt-1">Help shape the future of Receipt Hub. Report bugs or request features.</p>
                                </div>
                            </div>
                            <div className="text-gray-500 group-hover:text-gray-300 transition-transform duration-150 group-hover:translate-x-1 sm:pr-2 hidden sm:block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}

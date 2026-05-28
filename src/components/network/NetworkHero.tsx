import { useRouter } from 'next/navigation';

interface NetworkHeroProps {
    businessName: string | null;
    ownerName: string | null;
    businessLogoPath?: string | null;
    avatarLetter: string;
    totalConnections: number;
    pendingRequests: number;
    onFindBusinesses: () => void;
}

export default function NetworkHero({
    businessName,
    ownerName,
    businessLogoPath,
    avatarLetter,
    totalConnections,
    pendingRequests,
    onFindBusinesses
}: NetworkHeroProps) {
    const router = useRouter();

    return (
        <div className="relative w-full max-w-5xl mx-auto mt-6 sm:mt-10 mb-8 px-4 sm:px-6">
            {/* Animated CSS Gradient Background for the Hero Surface */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900/20 via-[#0B1220] to-purple-900/10 rounded-[32px] blur-3xl opacity-80 animate-pulse pointer-events-none" />

            {/* Main Floating Surface */}
            <div className="relative z-10 bg-[var(--card)]/60 backdrop-blur-3xl border border-[var(--border)] rounded-[32px] shadow-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 overflow-hidden">
                
                {/* Subtle Inner Mesh Gradient */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                {/* Left: Identity */}
                <div className="flex items-center gap-5 w-full md:w-auto flex-1">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-inner shrink-0 relative">
                        {businessLogoPath ? (
                            <img src={businessLogoPath} alt="Business Logo" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            avatarLetter
                        )}
                        {/* Optional Online Glow */}
                        {!businessLogoPath && <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[var(--card)] shadow-[0_0_8px_rgba(16,185,129,0.8)] z-10" />}
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] drop-shadow-sm tracking-tight">
                            {businessName || ownerName || "Your Network"}
                        </h1>
                        <p className="text-sm sm:text-base text-[var(--muted)] mt-0.5 font-medium">
                            {businessName ? ownerName : "Business Network"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                Verified
                            </span>
                            <span className="text-[11px] font-medium text-[var(--muted)]">
                                • Member since 2026
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Stats & Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex gap-4 w-full sm:w-auto">
                        <div className="flex flex-col justify-center">
                            <span className="text-2xl font-bold text-[var(--text)] tracking-tight">{totalConnections}</span>
                            <span className="text-[11px] text-[var(--muted)] font-medium mt-0.5">Active</span>
                        </div>
                        <div className="w-px h-10 bg-[var(--border)] self-center" />
                        <div className="flex flex-col justify-center relative">
                            {pendingRequests > 0 && (
                                <span className="absolute -top-1 -right-4 flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            )}
                            <span className="text-2xl font-bold text-[var(--text)] tracking-tight">{pendingRequests}</span>
                            <span className="text-[11px] text-[var(--muted)] font-medium mt-0.5">Pending</span>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto mt-4 md:mt-0 md:ml-4">
                        <button
                            onClick={onFindBusinesses}
                            className="flex-1 sm:flex-none bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-sm border border-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Discover
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/messages')}
                            className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 text-[var(--text)] text-sm font-semibold px-6 py-3 rounded-xl transition-all border border-white/5 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Messages
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

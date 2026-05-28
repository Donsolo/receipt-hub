import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

export interface ConnectionData {
    connectionId: string;
    status: string;
    connectedAt: string;
    connectedUser: {
        id: string;
        name: string | null;
        businessName: string | null;
        email?: string | null;
    };
}

interface ConnectionCardProps {
    connection: ConnectionData;
    onMessage: (connection: ConnectionData) => void;
    isActionLoading: boolean;
}

export default function ConnectionCard({ connection, onMessage, isActionLoading }: ConnectionCardProps) {
    const router = useRouter();
    const primary = connection.connectedUser.businessName?.trim() || connection.connectedUser.name?.trim() || connection.connectedUser.email?.trim() || "Unknown User";
    const secondary = connection.connectedUser.businessName ? (connection.connectedUser.name || 'Personal Account') : 'Personal Account';
    const avatarLetter = primary.charAt(0).toUpperCase();

    // Format Date
    const connectedDate = new Date(connection.connectedAt);
    const timeString = connectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div
            onClick={() => router.push(`/dashboard/connections/${connection.connectionId}`)}
            className="group relative bg-[var(--card)]/50 dark:bg-white/[0.02] backdrop-blur-xl hover:bg-[var(--card-hover)] border border-[var(--border)] rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] shadow-inner cursor-pointer overflow-hidden active:scale-[0.98]"
        >
            {/* Subtle Hover Glow Layer */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Left: Avatar */}
            <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    {connection.connectedUser.businessLogoPath ? (
                        <img src={connection.connectedUser.businessLogoPath} alt="Logo" className="w-full h-full object-cover rounded-full" />
                    ) : (
                        avatarLetter
                    )}
                    {/* Presence Indicator */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-[var(--bg)] shadow-sm z-10">
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse opacity-50" />
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[15px] sm:text-[16px] font-bold text-[var(--text)] group-hover:text-indigo-400 transition-colors truncate">
                        {primary}
                    </p>
                    <p className="text-[13px] text-[var(--muted)] mt-0.5 truncate">{secondary}</p>
                    
                    {/* Metadata Row */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-medium tracking-wide px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 backdrop-blur-sm">
                            {connection.status === 'accepted' ? 'Connected' : connection.status}
                        </span>
                        <span className="text-[11px] text-[var(--muted)]/70 hidden sm:inline-block font-medium">
                            &bull; Since {timeString}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onMessage(connection);
                    }}
                    title="Send Message"
                    disabled={isActionLoading}
                    className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-300 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
                
                <div className="hidden sm:flex text-[var(--muted)] group-hover:text-indigo-400 transition-colors duration-200 group-hover:translate-x-1 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

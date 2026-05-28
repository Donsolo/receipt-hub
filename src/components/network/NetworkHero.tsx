import { useRouter } from 'next/navigation';
import { IconSearch, IconMessageCircle, IconBuildingCommunity, IconCheck } from '@tabler/icons-react';

interface NetworkHeroProps {
    businessName: string | null;
    ownerName: string | null;
    businessLogoPath?: string | null;
    avatarLetter: string;
    totalConnections: number;
    pendingRequests: number;
    suggestedCount: number;
    onFindBusinesses: () => void;
    onPendingClick: () => void;
    onSuggestedClick: () => void;
}

export default function NetworkHero({
    businessName,
    ownerName,
    businessLogoPath,
    avatarLetter,
    totalConnections,
    pendingRequests,
    suggestedCount,
    onFindBusinesses,
    onPendingClick,
    onSuggestedClick
}: NetworkHeroProps) {
    const router = useRouter();

    return (
        <div className="relative pt-12 pb-24 px-5 bg-[#0B0F1A] text-white overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'rgba(99,102,241,0.22)' }}></div>
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'rgba(20,184,166,0.15)' }}></div>
            
            {/* Line Grid Overlay */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(99,102,241,0.10) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99,102,241,0.10) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px',
                    animation: 'grid-drift 8s linear infinite'
                }}
            ></div>
            
            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Identity Block */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-[54px] h-[54px] rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
                        {businessLogoPath ? (
                            <img src={businessLogoPath} alt="Business Logo" className="w-full h-full object-cover" />
                        ) : (
                            <IconBuildingCommunity size={28} className="text-white opacity-90" />
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                                {businessName || ownerName || "Your Network"}
                            </h1>
                            <div className="flex items-center gap-1 bg-[#10B981]/15 border border-[#10B981]/30 px-2 py-0.5 rounded-full">
                                <IconCheck size={12} className="text-[#34D399]" stroke={3} />
                                <span className="text-[10px] font-bold text-[#34D399] uppercase tracking-wider">Verified</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[13px] text-gray-400 font-medium">
                                {businessName ? ownerName : "Business Network"}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span className="text-[12px] font-medium text-gray-500">
                                Member since 2026
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Pills */}
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex-shrink-0 flex items-center space-x-2 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Active</span>
                            <span className="text-sm font-bold font-mono">{totalConnections}</span>
                        </div>
                    </div>
                    <button onClick={onPendingClick} className="flex-shrink-0 flex items-center space-x-2 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md text-left active:scale-95">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Pending</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold font-mono">{pendingRequests}</span>
                                {pendingRequests > 0 && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                            </div>
                        </div>
                    </button>
                    <button onClick={onSuggestedClick} className="flex-shrink-0 flex items-center space-x-2 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md text-left active:scale-95">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Suggested</span>
                            <span className="text-sm font-bold font-mono">{suggestedCount}</span>
                        </div>
                    </button>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                        onClick={onFindBusinesses}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[13px] font-bold px-4 py-3 rounded-xl transition-all active:scale-95"
                    >
                        <IconSearch size={16} />
                        Discover
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/messages')}
                        className="w-full flex items-center justify-center gap-2 bg-[#5B5FEF] hover:bg-[#4F54E5] text-white text-[13px] font-bold px-4 py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(91,95,239,0.3)] active:scale-95"
                    >
                        <IconMessageCircle size={16} />
                        Messages
                    </button>
                </div>
            </div>
        </div>
    );
}

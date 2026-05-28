import React from 'react';

interface DashboardHeroProps {
    title: string;
    subtitle: string;
    totalReceipts: number;
    thisMonthReceipts: number;
    lastActivityStr: string;
    relativeTimeStr?: string;
    children?: React.ReactNode;
}

export default function DashboardHero({
    title,
    subtitle,
    totalReceipts,
    thisMonthReceipts,
    lastActivityStr,
    relativeTimeStr,
    children
}: DashboardHeroProps) {
    return (
        <div className="relative pt-12 pb-24 px-5 bg-[#0B0F1A] text-white overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'rgba(99,102,241,0.22)' }}></div>
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}></div>
            
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
                <div className="mb-8 flex flex-col gap-1.5">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">{title}</h1>
                    <p className="text-[13px] sm:text-sm text-gray-400 font-medium">{subtitle}</p>
                    {children && (
                        <div className="mt-3 flex items-center gap-3">
                            {children}
                        </div>
                    )}
                </div>

                {/* Stats Pills */}
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex-shrink-0 flex items-center space-x-2.5 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Receipts</span>
                            <span className="text-sm font-bold font-mono text-white">{totalReceipts}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2.5 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">This Month</span>
                            <span className="text-sm font-bold font-mono text-white">{thisMonthReceipts}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2.5 bg-white/5 border border-white/10 rounded-[12px] px-3.5 py-2 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Last Activity</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold font-mono text-white">{lastActivityStr}</span>
                                {relativeTimeStr && <span className="text-[10px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-1.5 py-0.5 rounded-full">{relativeTimeStr}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

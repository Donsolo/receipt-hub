import React from 'react';

interface FunnelProps {
    data: {
        drafted: number;
        shared: number;
        viewed: number;
        approved: number;
    }
}

export default function FunnelChart({ data }: FunnelProps) {
    const max = Math.max(data.drafted, 1);
    
    const steps = [
        { label: 'Drafted', value: data.drafted, color: 'bg-gray-200 dark:bg-gray-700' },
        { label: 'Shared', value: data.shared, color: 'bg-indigo-300 dark:bg-indigo-800' },
        { label: 'Viewed', value: data.viewed, color: 'bg-indigo-500' },
        { label: 'Approved', value: data.approved, color: 'bg-emerald-500' }
    ];

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text)] mb-6">Quote Lifecycle Funnel</h3>
            <div className="flex flex-col gap-4 relative">
                {steps.map((step, idx) => {
                    const widthPercent = (step.value / max) * 100;
                    const dropoff = idx > 0 ? (steps[idx-1].value > 0 ? Math.round(((steps[idx-1].value - step.value) / steps[idx-1].value) * 100) : 0) : null;
                    
                    return (
                        <div key={step.label} className="flex items-center gap-4 relative">
                            <div className="w-20 sm:w-24 text-right shrink-0">
                                <span className="text-sm font-semibold text-[var(--text)]">{step.label}</span>
                            </div>
                            <div className="flex-1 h-10 sm:h-12 bg-[var(--bg)] rounded-r-xl overflow-hidden relative border-y border-r border-[var(--border)] flex items-center">
                                <div 
                                    className={`h-full ${step.color} transition-all duration-1000 ease-out flex items-center px-4`}
                                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                >
                                </div>
                                <span className="absolute left-4 font-bold text-white drop-shadow-md text-sm sm:text-base">{step.value}</span>
                            </div>
                            {/* Dropoff indicator */}
                            <div className="w-12 sm:w-16 shrink-0 text-right">
                                {dropoff !== null && dropoff > 0 && (
                                    <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                        -{dropoff}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)]">
                    Identifies where quotes drop off in the conversion process.
                </p>
            </div>
        </div>
    );
}

import React from 'react';

interface PageHeaderCardProps {
    title: string;
    description: string;
    children?: React.ReactNode;
    badge?: string;
}

export default function PageHeaderCard({ title, description, badge, children }: PageHeaderCardProps) {
    return (
        <div className="relative z-10 w-full max-w-6xl mx-auto -mt-[60px] md:-mt-[80px] p-6 md:p-8 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-black/10 dark:bg-slate-900/70 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-black/40 mb-8">
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {title}
                </h1>
                {badge && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium tracking-widest uppercase ${badge.toUpperCase() === 'PRO' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                {description}
            </p>
            {children && <div className="mt-4 flex items-center justify-center gap-3">{children}</div>}
        </div>
    );
}

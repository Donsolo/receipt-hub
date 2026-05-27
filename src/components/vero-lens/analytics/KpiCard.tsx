import React from 'react';
import { clsx } from 'clsx';

interface KpiCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendText?: string;
}

export default function KpiCard({ title, value, description, icon, trend, trendText }: KpiCardProps) {
    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">{title}</h3>
                {icon && <div className="text-indigo-500 bg-indigo-500/10 p-2 rounded-xl">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-3 mb-1 mt-auto">
                <span className="text-3xl font-bold text-[var(--text)]">{value}</span>
                {trend && trendText && (
                    <span className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        trend === 'up' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        trend === 'down' ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                        "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                    )}>
                        {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : '→ '}{trendText}
                    </span>
                )}
            </div>
            {description && <p className="text-xs text-[var(--muted)] mt-3 pt-3 border-t border-[var(--border)]">{description}</p>}
        </div>
    );
}

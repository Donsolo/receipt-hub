import Link from 'next/link';
import { clsx } from 'clsx';

export default function MobileFilterBar({ filterParam }: { filterParam: string }) {
    const filters = [
        { id: 'all', label: 'All' },
        { id: 'draft', label: 'Draft' },
        { id: 'sent', label: 'Sent' },
        { id: 'viewed', label: 'Viewed' },
        { id: 'paid', label: 'Paid' },
        { id: 'overdue', label: 'Overdue' },
    ];

    return (
        <div className="w-full -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 scrollbar-hide relative">
            <div className="flex items-center gap-2 min-w-max">
                {filters.map((filter) => {
                    const isActive = filterParam === filter.id;
                    return (
                        <Link 
                            key={filter.id}
                            href={filter.id === 'all' ? '/dashboard/invoices' : `/dashboard/invoices?filter=${filter.id}`}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm",
                                isActive 
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-black" 
                                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-gray-300 dark:hover:border-gray-600"
                            )}
                        >
                            {filter.label}
                        </Link>
                    );
                })}
            </div>
            
            {/* Fade effect for scroll indicating more items */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent pointer-events-none sm:hidden" />
        </div>
    );
}

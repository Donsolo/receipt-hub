"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { IconBuildingCommunity } from '@tabler/icons-react';

interface NavigationDrawerProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    userName: string;
    businessName: string;
    businessLogoPath?: string | null;
    isPro: boolean;
    role?: string;
    activeInvoicesCount: number;
    handleLogout: () => void;
    pathname: string | null;
}

export default function NavigationDrawer({
    isOpen,
    setIsOpen,
    userName,
    businessName,
    businessLogoPath,
    isPro,
    role,
    activeInvoicesCount,
    handleLogout,
    pathname
}: NavigationDrawerProps) {
    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [setIsOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Avatar Initials
    const displayName = businessName || userName || 'Vero Member';
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Nav Item Component
    const NavCard = ({ href, icon, title, subtitle, badge }: { href: string, icon: React.ReactNode, title: string, subtitle: string, badge?: React.ReactNode }) => {
        const isActive = pathname === href;
        return (
            <Link 
                href={href} 
                onClick={() => setIsOpen(false)}
                className={clsx(
                    "flex items-center gap-4 px-4 py-3 rounded-2xl border transition-colors duration-300 group relative overflow-hidden",
                    isActive 
                        ? "bg-[var(--drawer-card-hover)] border-[var(--drawer-card-border-hover)]" 
                        : "bg-[var(--drawer-card-bg)] border-[var(--drawer-card-border)] hover:bg-[var(--drawer-card-hover)] hover:border-[var(--drawer-card-border-hover)]"
                )}
            >
                {/* Icon Box */}
                <div className={clsx(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                    isActive 
                        ? "bg-[var(--drawer-icon-bg-active)] text-[var(--drawer-icon-text-active)] border border-[var(--drawer-card-border-hover)]" 
                        : "bg-[var(--drawer-icon-bg)] text-[var(--drawer-icon-text)] group-hover:bg-[var(--drawer-icon-bg-active)] group-hover:text-[var(--drawer-icon-text-active)] group-hover:border group-hover:border-[var(--drawer-card-border-hover)]"
                )}>
                    {icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={clsx("text-sm font-semibold truncate transition-colors", isActive ? "text-[var(--drawer-text-primary)]" : "text-[var(--drawer-text-secondary)] group-hover:text-[var(--drawer-text-primary)]")}>
                            {title}
                        </span>
                        {badge && badge}
                    </div>
                    <span className="text-[11px] text-[var(--drawer-text-secondary)] truncate block mt-0.5">{subtitle}</span>
                </div>

                {/* Chevron */}
                <div className="flex-shrink-0 text-[var(--drawer-text-secondary)] group-hover:text-[var(--drawer-text-primary)] transition-transform group-hover:translate-x-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </Link>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 z-[100] backdrop-blur-sm transition-all duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                style={{ backgroundColor: 'var(--drawer-backdrop)' }}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div
                style={{ 
                    contain: 'layout style', 
                    willChange: 'transform',
                    backgroundColor: 'var(--drawer-bg)',
                    borderColor: 'var(--drawer-border)',
                    boxShadow: 'var(--drawer-shadow)'
                }}
                className={clsx(
                    "fixed top-0 left-0 z-[101] h-full w-[85vw] sm:w-[380px] backdrop-blur-2xl border-r flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pt-[env(safe-area-inset-top)]",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header Actions */}
                <div className="flex justify-between items-center p-4">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors ml-auto text-[var(--drawer-text-secondary)] hover:text-[var(--drawer-text-primary)] bg-[var(--drawer-card-bg)] hover:bg-[var(--drawer-card-hover)]"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">
                    
                    {/* Identity Header */}
                    <div className="mb-8 relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-[54px] h-[54px] rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
                                {businessLogoPath ? (
                                    <img src={businessLogoPath} alt="Business Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <IconBuildingCommunity size={28} className="text-white opacity-90" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="font-semibold text-lg tracking-tight leading-tight transition-colors text-[var(--drawer-text-primary)]">{businessName || 'Business Workspace'}</h2>
                                <p className="text-sm mt-0.5 transition-colors text-[var(--drawer-text-secondary)]">{userName || 'Member'}</p>
                            </div>
                        </div>

                        {/* Badges / Presence */}
                        <div className="flex items-center gap-2">
                            {isPro ? (
                                <span 
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors"
                                    style={{ backgroundColor: 'var(--drawer-badge-pro-bg)', color: 'var(--drawer-badge-pro-text)', borderColor: 'var(--drawer-badge-pro-bg)' }}
                                >
                                    PRO MEMBER
                                </span>
                            ) : (
                                <span 
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors"
                                    style={{ backgroundColor: 'var(--drawer-badge-std-bg)', color: 'var(--drawer-badge-std-text)', borderColor: 'var(--drawer-badge-std-bg)' }}
                                >
                                    STANDARD
                                </span>
                            )}
                            {activeInvoicesCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    {activeInvoicesCount} Active Invoices
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <Link href="/history" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors bg-[var(--drawer-icon-bg-active)] text-[var(--drawer-icon-text-active)] border border-[var(--drawer-card-border-hover)] hover:opacity-80">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Scan Receipt
                        </Link>
                        {isPro && (
                            <Link href="/dashboard/invoices" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors bg-[var(--drawer-card-bg)] hover:bg-[var(--drawer-card-hover)] text-[var(--drawer-text-primary)] border border-[var(--drawer-card-border)]">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                New Invoice
                            </Link>
                        )}
                    </div>

                    {/* Primary Navigation */}
                    <div className="space-y-2.5 mb-8">
                        <div className="px-1 mb-2 text-[10px] font-bold text-[var(--drawer-text-secondary)] uppercase tracking-widest">Command Center</div>
                        <NavCard 
                            href="/dashboard"
                            title="Dashboard"
                            subtitle="Overview & metrics"
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                        />
                        <NavCard 
                            href="/dashboard/messages"
                            title="Messages"
                            subtitle="Secure communications"
                            badge={<span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                        />
                    </div>

                    {/* Secondary Navigation */}
                    <div className="space-y-2.5 mb-8">
                        <div className="px-1 mb-2 text-[10px] font-bold text-[var(--drawer-text-secondary)] uppercase tracking-widest">Settings & Utilities</div>
                        <NavCard 
                            href="/dashboard/profile"
                            title="Profile"
                            subtitle="Account preferences"
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        />
                        {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                            <NavCard 
                                href="/admin"
                                title="Admin CP"
                                subtitle="Platform management"
                                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                            />
                        )}
                    </div>
                </div>

                {/* Footer Section */}
                <div 
                    className="p-5 border-t transition-colors"
                    style={{ backgroundColor: 'var(--drawer-footer-bg)', borderColor: 'var(--drawer-footer-border)' }}
                >
                    <Link 
                        href="/dashboard/vero" 
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center gap-3 p-3 rounded-2xl border transition-colors relative overflow-hidden"
                        style={{ 
                            background: `linear-gradient(to right, var(--drawer-vero-gradient-from), var(--drawer-vero-gradient-to))`,
                            borderColor: 'var(--drawer-vero-border)'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-300 dark:to-purple-300">Vero Suite{isPro ? '+' : ''}</h3>
                            <p className="text-[11px] font-medium text-[var(--drawer-text-secondary)]">Access AI Business Tools</p>
                        </div>
                    </Link>

                    <button 
                        onClick={() => {
                            setIsOpen(false);
                            handleLogout();
                        }}
                        className="w-full mt-4 py-2.5 rounded-xl border border-red-500/20 text-red-500 text-sm font-semibold hover:bg-red-500/10 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}

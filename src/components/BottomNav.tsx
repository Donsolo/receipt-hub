"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useRef, useEffect } from 'react';
import VeroAssistant from './vero/VeroAssistant';

export default function BottomNav({ isPro }: { isPro?: boolean }) {
    const pathname = usePathname();
    const [showVeroOverlay, setShowVeroOverlay] = useState(false);
    const [startVoice, setStartVoice] = useState(false);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [unpaidCount, setUnpaidCount] = useState(0);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    useEffect(() => {
        fetch('/api/billing/summary')
            .then(res => res.json())
            .then(data => {
                if (data?.success && data?.data?.incoming?.unpaidCount) {
                    setUnpaidCount(data.data.incoming.unpaidCount);
                }
            })
            .catch(() => {});
    }, [pathname]);

    useEffect(() => {
        // Detect keyboard opening via Capacitor events or window resize fallback
        const initialHeight = window.innerHeight;
        
        const handleResize = () => {
            if (initialHeight - window.innerHeight > 150) {
                setIsKeyboardOpen(true);
            } else {
                setIsKeyboardOpen(false);
            }
        };

        const handleKeyboardShow = () => setIsKeyboardOpen(true);
        const handleKeyboardHide = () => setIsKeyboardOpen(false);

        window.addEventListener('resize', handleResize);
        window.addEventListener('keyboardWillShow', handleKeyboardShow);
        window.addEventListener('keyboardWillHide', handleKeyboardHide);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keyboardWillShow', handleKeyboardShow);
            window.removeEventListener('keyboardWillHide', handleKeyboardHide);
        };
    }, []);

    // Do not show on invoice public view pages
    if (pathname?.startsWith('/invoice/')) return null;

    const navItems = [
        {
            href: '/history',
            label: 'Receipts',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        ...(isPro ? [{
            href: '/dashboard/invoices',
            label: 'Invoices',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            )
        }] : []),
        {
            href: '/dashboard/vero',
            label: isPro ? 'Vero+' : 'Vero',
            isSpecial: true,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            )
        },
        {
            href: '/dashboard/billing',
            label: 'Billing',
            badge: unpaidCount > 0 ? unpaidCount : undefined,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            )
        },
        {
            href: '/dashboard/connections',
            label: 'Network',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        }
    ];

    return (
        <>
            {/* Spacer to prevent content from hiding behind the fixed bottom nav on mobile */}
            <div className="h-24 md:hidden w-full flex-shrink-0" />

            <div className={clsx(
                "md:hidden fixed bottom-5 left-5 right-5 z-50 pb-safe pointer-events-none transition-transform duration-300",
                isKeyboardOpen ? "translate-y-[150%] opacity-0" : "translate-y-0 opacity-100"
            )}>
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full" />
                <div className="relative bg-[var(--card)]/70 dark:bg-[#0B1220]/60 backdrop-blur-3xl border border-[var(--border)] shadow-2xl shadow-black/50 rounded-[32px] flex items-center justify-around h-[72px] px-2 pointer-events-auto overflow-visible">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        
                        if (item.isSpecial) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={(e) => {
                                        if (isLongPress.current) {
                                            e.preventDefault();
                                            return;
                                        }
                                        if (pathname === '/dashboard/vero') {
                                            e.preventDefault();
                                            setShowVeroOverlay(true);
                                            setStartVoice(false);
                                        }
                                    }}
                                    onTouchStart={() => {
                                        isLongPress.current = false;
                                        pressTimer.current = setTimeout(() => {
                                            isLongPress.current = true;
                                            setShowVeroOverlay(true);
                                            setStartVoice(true);
                                        }, 600);
                                    }}
                                    onTouchEnd={() => {
                                        if (pressTimer.current) clearTimeout(pressTimer.current);
                                    }}
                                    onMouseDown={() => {
                                        isLongPress.current = false;
                                        pressTimer.current = setTimeout(() => {
                                            isLongPress.current = true;
                                            setShowVeroOverlay(true);
                                            setStartVoice(true);
                                        }, 600);
                                    }}
                                    onMouseUp={() => {
                                        if (pressTimer.current) clearTimeout(pressTimer.current);
                                    }}
                                    onMouseLeave={() => {
                                        if (pressTimer.current) clearTimeout(pressTimer.current);
                                    }}
                                    className="flex flex-col items-center justify-center w-full h-full relative -mt-6 z-10"
                                >
                                    <div className={clsx(
                                        "w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 relative",
                                        isActive 
                                            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-[6px] ring-[var(--bg)] scale-110" 
                                            : "bg-[var(--bg)] text-indigo-400 border border-[var(--border)] shadow-md hover:bg-indigo-500/10 hover:text-indigo-300 ring-[6px] ring-[var(--bg)] hover:scale-105"
                                    )}>
                                        {/* Subtle internal glow when active */}
                                        {isActive && <div className="absolute inset-0 rounded-full bg-white/20 blur-[2px]" />}
                                        <div className="relative z-10">{item.icon}</div>
                                    </div>
                                    <span className={clsx("text-[10px] font-bold mt-2 transition-colors", isActive ? "text-indigo-400" : "text-[var(--muted)]")}>{item.label}</span>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group",
                                    isActive ? "text-indigo-400" : "text-[var(--muted)] hover:text-[var(--text)]"
                                )}
                            >
                                {/* Background Highlight for Active State */}
                                {isActive && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[15px] w-12 h-8 bg-indigo-500/10 dark:bg-white/5 rounded-full pointer-events-none" />
                                )}
                                <div className={clsx("transition-transform duration-300 relative z-10", isActive ? "scale-110 -translate-y-1" : "group-hover:scale-105")}>
                                    {item.icon}
                                    {item.badge && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-[var(--card)] shadow-md">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className={clsx("text-[10px] transition-all duration-300 z-10", isActive ? "font-bold" : "font-medium")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Global Vero Overlay */}
            {showVeroOverlay && isPro && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full h-full absolute inset-0" onClick={() => setShowVeroOverlay(false)} />
                    <div className="relative z-10 w-full animate-in slide-in-from-bottom-full duration-300">
                        <VeroAssistant isOverlay={true} initialInput={startVoice ? " " : ""} />
                        <button 
                            onClick={() => setShowVeroOverlay(false)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useRef, useEffect } from 'react';
import VeroAssistant from './vero/VeroAssistant';
import { IconReceipt, IconFileText, IconSparkles, IconCreditCard, IconUsers } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

export default function BottomNav() {
    const { isAuthenticated, user } = useAuth();
    const isPro = (user?.plan === "PRO" && user?.planStatus !== "inactive") || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    const pathname = usePathname();
    const [showVeroOverlay, setShowVeroOverlay] = useState(false);
    const [startVoice, setStartVoice] = useState(false);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [unpaidCount, setUnpaidCount] = useState(0);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    useEffect(() => {
        (async () => fetch(`${API_BASE_URL}/api/billing/summary`, { headers: { ...((await getAuthHeader()) as any) } }))()
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

    const normalizedPath = pathname?.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
    // Do not show on invoice public view pages
    if (normalizedPath.startsWith('/invoice/') || !isAuthenticated) return null;

    const navItems: Array<{ href: string, label: string, isSpecial?: boolean, badge?: number, icon: React.ReactNode }> = [
        {
            href: '/history',
            label: 'Receipts',
            icon: <IconReceipt size={24} stroke={1.5} />
        },
        ...(isPro ? [{
            href: '/dashboard/invoices',
            label: 'Invoices',
            icon: <IconFileText size={24} stroke={1.5} />
        }] : []),
        {
            href: '/dashboard/vero',
            label: isPro ? 'Vero+' : 'Vero',
            isSpecial: true,
            icon: <IconSparkles size={24} stroke={1.5} />
        },
        {
            href: '/dashboard/billing',
            label: 'Billing',
            badge: unpaidCount > 0 ? unpaidCount : undefined,
            icon: <IconCreditCard size={24} stroke={1.5} />
        },
        {
            href: '/dashboard/connections',
            label: 'Network',
            icon: <IconUsers size={24} stroke={1.5} />
        }
    ];

    return (
        <>
            {/* Overlay for Vero Voice Assistant */}
            {/* The previous overlay logic is consolidated at the bottom. */}

            {/* Spacer to prevent content from hiding behind the fixed bottom nav on mobile */}
            <div className="h-24 md:hidden w-full flex-shrink-0" />

            {/* Bottom Nav Container */}
            <div className={clsx(
                "md:hidden fixed bottom-5 left-5 right-5 z-50 pb-safe pointer-events-none transition-transform duration-300",
                isKeyboardOpen ? "translate-y-[150%] opacity-0" : "translate-y-0 opacity-100"
            )}>
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full" />
                <div className="relative bg-[var(--card)]/70 dark:bg-[#0B1220]/60 backdrop-blur-3xl border border-[var(--border)] shadow-2xl shadow-black/50 rounded-[32px] flex items-center justify-around h-[72px] px-2 pointer-events-auto overflow-visible">
                    {navItems.map((item) => {
                        const isActive = normalizedPath === item.href || (item.href !== '/dashboard' && normalizedPath.startsWith(item.href));
                        
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
                                    className="flex flex-col items-center justify-center relative -mt-[18px] z-10"
                                >
                                    <div className="w-[48px] h-[48px] rounded-[16px] bg-[#5B5FEF] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(91,95,239,0.4)] flex-shrink-0 cursor-pointer">
                                        {item.icon}
                                    </div>
                                    <span className={clsx("text-[10px] font-bold mt-1 transition-colors", isActive ? "text-[#5B5FEF]" : "text-[var(--muted)]")}>{item.label}</span>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group",
                                    isActive ? "text-[#5B5FEF]" : "text-[var(--muted)] hover:text-[#5B5FEF]"
                                )}
                            >
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

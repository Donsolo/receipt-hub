"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useNotifications } from '@/context/NotificationContext';

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return "Just now";
}

function NotificationBell() {
    const { notifications, unreadCount, isDrawerOpen: isOpen, setIsDrawerOpen: setIsOpen, markRead, markAllRead } = useNotifications();
    const router = useRouter();

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleNotificationClick = async (notif: { id: string; link?: string | null; read: boolean }) => {
        if (!notif.read) {
            await markRead(notif.id);
        }
        if (notif.link) {
            router.push(notif.link);
        }
        setIsOpen(false);
    };

    return (
        <>
            <div className="relative flex items-center">
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative p-2 rounded-md text-[var(--header-icon)] hover:text-[var(--header-icon-hover)] hover:bg-[var(--header-icon-hover-bg)] transition-colors focus:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center ml-1"
                    aria-label="Open notifications"
                >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-[var(--bg)]">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Backdrop Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Sliding Drawer */}
            <div
                className={clsx(
                    "fixed top-0 right-0 z-[101] h-full w-full sm:w-[360px] bg-[var(--bg)] shadow-2xl border-l border-[var(--border)] flex flex-col transform transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-semibold text-[var(--text)]">Notifications</h2>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllRead()}
                                className="text-xs font-medium text-indigo-500 hover:text-indigo-400 transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors"
                            aria-label="Close notifications"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Drawer Body - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--card)] flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <p className="text-[var(--text)] font-medium text-sm">You&apos;re all caught up.</p>
                            <p className="text-[var(--muted)] text-xs mt-1">No new notifications right now.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-[var(--border)]">
                            {notifications.map((notif) => (
                                <li
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={clsx(
                                        "p-4 hover:bg-[var(--card-hover)] cursor-pointer transition-colors relative group",
                                        !notif.read && "bg-[var(--card)]/50"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className={clsx(
                                                "text-sm font-semibold truncate",
                                                !notif.read ? "text-[var(--text)]" : "text-[var(--text)] opacity-80"
                                            )}>
                                                {notif.title}
                                            </p>
                                            <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <p className="mt-2 text-[10px] text-[var(--muted)] font-medium">
                                                {formatTimeAgo(notif.createdAt)}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="flex-shrink-0 mt-1">
                                                <span className="block w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}

export default function Navbar({ isAuthenticated, role }: { isAuthenticated: boolean; role?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.refresh();
        router.push('/');
    };

    const authLinks = [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/history', label: 'Receipts' },
        { href: '/dashboard/connections', label: 'Network' },
        { href: '/dashboard/profile', label: 'Profile' }
    ];

    const guestLinks = [
        { href: '/login', label: 'Login' },
        { href: '/register', label: 'Register' },
    ];

    return (
        <header className="sticky top-0 w-full flex-shrink-0 bg-[var(--header-bg)] border-b border-[var(--header-border)] z-50">
            <div className="max-w-7xl mx-auto px-[20px]">
                <div className="flex justify-between h-[60px]">
                    <div className="flex">
                        <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center group transition-transform duration-200 hover:opacity-90">
                            <img
                                src="/assets/verihub-logo-icon.png"
                                alt="Verihub Logo"
                                width={36}
                                height={36}
                                className="h-[36px] w-auto mr-[12px] group-hover:-translate-y-[1px] transition-transform duration-200"
                            />
                            <img
                                src="/assets/text-logo.png"
                                alt="Verihub"
                                width={180}
                                height={45}
                                className="h-[28px] sm:h-[32px] w-auto group-hover:-translate-y-[1px] transition-transform duration-200"
                            />
                        </Link>
                    </div>

                    {/* Right Side Tools */}
                    <div className="flex items-center space-x-1 sm:space-x-4">
                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-2">
                            {isAuthenticated && (
                                <>
                                    {authLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="text-[var(--header-icon)] hover:text-[var(--header-icon-hover)] hover:bg-[var(--header-icon-hover-bg)] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                    {role === 'ADMIN' || role === 'SUPER_ADMIN' ? (
                                        <Link
                                            href="/admin"
                                            className="text-[var(--header-icon)] hover:text-[var(--header-icon-hover)] hover:bg-[var(--header-icon-hover-bg)] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Admin
                                        </Link>
                                    ) : null}
                                    <button
                                        onClick={handleLogout}
                                        className="text-[var(--header-icon)] hover:text-[var(--header-icon-hover)] hover:bg-[var(--header-icon-hover-bg)] px-3 py-2 rounded-md text-sm font-medium transition-colors ml-2"
                                    >
                                        Sign Out
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Universal Notification Bell */}
                        {isAuthenticated && <NotificationBell />}

                        {/* Mobile Menu Button */}
                        <div className="flex items-center md:hidden pl-1 sm:pl-2">
                            {isAuthenticated && (
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-[var(--header-icon)] hover:text-[var(--header-icon-hover)] hover:bg-[var(--header-icon-hover-bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
                                >
                                    <span className="sr-only">Open main menu</span>
                                    {!isMenuOpen ? (
                                        <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    ) : (
                                        <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isAuthenticated && isMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-[var(--bg)] border-b border-[var(--border)] shadow-xl">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {authLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--text)] hover:text-[var(--text)] block px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--card)]"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {role === 'ADMIN' || role === 'SUPER_ADMIN' ? (
                            <Link
                                href="/admin"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--text)] hover:text-[var(--text)] block px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--card)]"
                            >
                                Admin
                            </Link>
                        ) : null}
                        <button
                            onClick={() => {
                                setIsMenuOpen(false);
                                handleLogout();
                            }}
                            className="text-[var(--text)] hover:text-[var(--text)] block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--card)]"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}

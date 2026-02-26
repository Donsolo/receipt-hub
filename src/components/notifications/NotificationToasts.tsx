"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useNotifications } from '@/context/NotificationContext';

type ToastData = {
    id: string; // The notification ID
    title: string;
    message: string;
    link?: string | null;
    isClosing?: boolean;
};

export default function NotificationToasts() {
    const { notifications, markRead, isDrawerOpen } = useNotifications();
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const shownIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const newUnread = notifications.filter(n => !n.read && !shownIds.current.has(n.id));

        if (newUnread.length > 0) {
            // Mark all incoming as shown regardless so they don't spam when drawer closes
            newUnread.forEach(n => shownIds.current.add(n.id));

            if (!isDrawerOpen) {
                const newToasts = newUnread.map(n => ({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    link: n.link
                }));

                // Add to toasts list
                setToasts(prev => [...prev, ...newToasts].slice(-5));
            }
        }
    }, [notifications, isDrawerOpen]);

    const removeToast = (id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300); // Wait for CSS transition
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 sm:right-6 lg:right-8 z-[150] flex flex-col gap-3 w-[calc(100%-2rem)] sm:w-[320px] pointer-events-none">
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                    markRead={markRead}
                />
            ))}
        </div>
    );
}

function ToastItem({
    toast,
    onClose,
    markRead
}: {
    toast: ToastData;
    onClose: () => void;
    markRead: (id: string) => Promise<void>;
}) {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true); // Trigger slide in
    }, []);

    useEffect(() => {
        if (isHovered) return;
        if (toast.isClosing) return;

        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [isHovered, onClose, toast.isClosing]);

    const handleClick = async () => {
        await markRead(toast.id);
        if (toast.link) {
            router.push(toast.link);
        }
        onClose();
    };

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={clsx(
                "pointer-events-auto bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-lg overflow-hidden flex transform transition-all duration-300 ease-out",
                isMounted && !toast.isClosing ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
            )}
        >
            <div className="w-1.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
            <div
                className="flex-1 p-4 cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
                onClick={handleClick}
            >
                <div className="flex justify-between items-start">
                    <h3 className="text-sm font-semibold text-[var(--text)]">{toast.title}</h3>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-[var(--muted)] hover:text-[var(--text)] ml-4 focus:outline-none"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2 pr-4">{toast.message}</p>
            </div>
        </div>
    );
}

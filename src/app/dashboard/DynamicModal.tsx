"use client";

import { useEffect, useState } from 'react';

type AnnouncementType = 'ANNOUNCEMENT' | 'CHANGELOG' | 'APOLOGY';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: AnnouncementType;
}

export default function DynamicModal({
    announcement,
    onClose
}: {
    announcement: Announcement;
    onClose: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Double check it hasn't somehow been seen
        const hasSeen = localStorage.getItem(`announcement_seen_${announcement.id}`);
        if (!hasSeen) {
            setIsOpen(true);
        } else {
            onClose(); // Automatically skip if already seen somehow
        }
    }, [announcement.id, onClose]);

    if (!isOpen) return null;

    const handleDismiss = () => {
        localStorage.setItem(`announcement_seen_${announcement.id}`, "true");
        setIsOpen(false);
        onClose();
    };

    // Determine Theme based on Type
    const getTheme = () => {
        switch (announcement.type) {
            case 'CHANGELOG':
                return {
                    bg: 'bg-blue-50/50 dark:bg-blue-900/10',
                    border: 'border-blue-500/20',
                    btnBg: 'bg-blue-600 hover:bg-blue-700',
                    btnText: 'text-white'
                };
            case 'APOLOGY':
                return {
                    bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
                    border: 'border-indigo-500/20',
                    btnBg: 'bg-indigo-600 hover:bg-indigo-700',
                    btnText: 'text-white'
                };
            case 'ANNOUNCEMENT':
            default:
                return {
                    bg: 'bg-[var(--bg)]',
                    border: 'border-[var(--border)]',
                    btnBg: 'bg-[var(--text)] hover:bg-[var(--text)]/90',
                    btnText: 'text-[var(--bg)]'
                };
        }
    };

    const theme = getTheme();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[var(--bg)]/40 backdrop-blur-sm" onClick={handleDismiss} />

            <div className={`relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${theme.border}`}>
                <div className={`p-6 border-b border-[var(--border)] ${theme.bg}`}>
                    <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        {announcement.type === 'CHANGELOG' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        {announcement.type === 'APOLOGY' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {announcement.type === 'ANNOUNCEMENT' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        )}
                        {announcement.title}
                    </h2>
                </div>

                <div
                    className="p-6 overflow-y-auto max-h-[60vh] text-[15px] text-[var(--text)] leading-relaxed space-y-4 prose prose-sm prose-invert"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                />

                <div className="p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleDismiss}
                        className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg shadow-sm transition-colors ${theme.btnBg} ${theme.btnText}`}
                    >
                        Got It
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { XMarkIcon, InformationCircleIcon, SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

type BroadcastMessage = {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'UPDATE' | 'WARNING' | 'SUCCESS';
    dismissible: boolean;
};

export default function BroadcastDisplay() {
    const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        fetchActiveBroadcasts();
    }, []);

    const fetchActiveBroadcasts = async () => {
        try {
            const res = await fetch('/api/broadcasts/active');
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    setBroadcasts(data);
                    setIsVisible(true);
                }
            }
        } catch (error) {
            console.error('Failed to fetch broadcasts:', error);
        }
    };

    const currentBroadcast = broadcasts[currentIndex];

    useEffect(() => {
        if (currentBroadcast) {
            // Track view when shown
            fetch(`/api/broadcasts/view/${currentBroadcast.id}`, { method: 'POST' })
                .catch(err => console.error('Failed to track view:', err));
        }
    }, [currentBroadcast?.id]);

    const handleDismiss = async () => {
        if (!currentBroadcast) return;

        try {
            await fetch('/api/broadcasts/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ broadcastId: currentBroadcast.id })
            });

            // If there are more broadcasts, show the next one
            if (currentIndex < broadcasts.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                setIsVisible(false);
            }
        } catch (error) {
            console.error('Failed to dismiss broadcast:', error);
        }
    };

    if (!isVisible || !currentBroadcast) return null;

    const styles = {
        INFO: {
            bg: 'bg-blue-600/10',
            border: 'border-blue-500/20',
            text: 'text-blue-400',
            icon: <InformationCircleIcon className="h-5 w-5 text-blue-400" />,
            button: 'hover:bg-blue-500/10'
        },
        UPDATE: {
            bg: 'bg-purple-600/10',
            border: 'border-purple-500/20',
            text: 'text-purple-400',
            icon: <SparklesIcon className="h-5 w-5 text-purple-400" />,
            button: 'hover:bg-purple-500/10'
        },
        WARNING: {
            bg: 'bg-amber-600/10',
            border: 'border-amber-500/20',
            text: 'text-amber-400',
            icon: <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />,
            button: 'hover:bg-amber-500/10'
        },
        SUCCESS: {
            bg: 'bg-emerald-600/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400',
            icon: <CheckCircleIcon className="h-5 w-5 text-emerald-400" />,
            button: 'hover:bg-emerald-500/10'
        }
    }[currentBroadcast.type];

    return (
        <div className={`w-full border-b ${styles.border} ${styles.bg} backdrop-blur-md animate-in slide-in-from-top duration-500 sticky top-0 z-[60]`}>
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="shrink-0 mt-0.5">
                            {styles.icon}
                        </div>
                        <div className="space-y-1">
                            <h4 className={`text-sm font-bold ${styles.text} uppercase tracking-wider`}>
                                {currentBroadcast.title}
                            </h4>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {currentBroadcast.message}
                            </p>
                            {broadcasts.length > 1 && (
                                <div className="text-[10px] text-[var(--muted)] font-medium pt-1">
                                    Message {currentIndex + 1} of {broadcasts.length}
                                </div>
                            )}
                        </div>
                    </div>
                    {currentBroadcast.dismissible && (
                        <button
                            onClick={handleDismiss}
                            className={`shrink-0 p-1 rounded-md transition-colors ${styles.button} text-[var(--muted)] hover:text-[var(--text-primary)]`}
                            title="Dismiss"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

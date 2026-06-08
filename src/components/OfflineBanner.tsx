"use client";

import React, { useEffect, useState } from 'react';
import { useNetwork } from '@/lib/network-context';

export default function OfflineBanner() {
    const { isOnline } = useNetwork();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isOnline) {
            // Only show offline banner after 2 seconds to avoid false flash
            timer = setTimeout(() => setVisible(true), 2000);
        } else {
            // If we came back online but visible is true, show "Back online" for 3s then hide
            if (visible) {
                timer = setTimeout(() => setVisible(false), 3000);
            } else {
                setVisible(false);
            }
        }
        return () => clearTimeout(timer);
    }, [isOnline, visible]);

    if (!visible && isOnline) return null;

    return (
        <div className={`w-full py-2 px-4 flex items-center justify-center transition-all duration-300 z-50 fixed top-0 left-0 right-0 ${isOnline ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
            <div className="flex items-center space-x-2 text-sm font-medium">
                {isOnline ? (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Back online!</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>You're offline. Some features may be unavailable.</span>
                    </>
                )}
            </div>
        </div>
    );
}

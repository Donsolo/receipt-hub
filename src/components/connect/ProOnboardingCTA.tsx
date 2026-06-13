'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconX, IconCreditCard } from '@tabler/icons-react';

export default function ProOnboardingCTA() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusChecked, setStatusChecked] = useState(false);

    useEffect(() => {
        // Check if dismissed
        if (localStorage.getItem('verihub_dismissed_connect_cta')) {
            setStatusChecked(true);
            return;
        }

        // Fetch connect status
        fetch('/api/connect/status')
            .then(res => res.json())
            .then(data => {
                if (!data.error && data.status !== 'COMPLETE') {
                    setIsVisible(true);
                }
                setStatusChecked(true);
            })
            .catch(() => setStatusChecked(true));
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('verihub_dismissed_connect_cta', 'true');
        setIsVisible(false);
    };

    const handleSetup = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/connect/create-account-link', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.url) {
                if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
                    const { Browser } = require('@capacitor/browser');
                    await Browser.open({ url: data.url });
                } else {
                    window.location.href = data.url;
                }
            } else {
                throw new Error(data.error || 'Failed to create account link');
            }
        } catch (error) {
            console.error('Error starting setup:', error);
            setIsLoading(false);
        }
    };

    if (!statusChecked || !isVisible) return null;

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-2xl p-6 shadow-lg mb-8 backdrop-blur-md">
            <button 
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-blue-400 hover:text-white transition-colors"
                aria-label="Dismiss"
            >
                <IconX size={20} />
            </button>

            <div className="flex items-start gap-5">
                <div className="p-3 bg-blue-500/20 rounded-xl shrink-0">
                    <IconCreditCard className="w-8 h-8 text-blue-400" stroke={1.5} />
                </div>
                
                <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Get paid faster with Stripe</h3>
                    <p className="text-blue-200/80 mb-5 max-w-xl">
                        Your invoicing is unlocked — set up payments to start accepting online card payments directly to your bank account. Takes about 5 minutes.
                    </p>
                    
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSetup}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[140px]"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Set up payments'}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-blue-300 hover:text-white transition-colors font-medium px-2 py-2"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Decorative background elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );
}

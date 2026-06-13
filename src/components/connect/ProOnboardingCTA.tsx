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
        <div 
            className="relative overflow-hidden rounded-[20px] p-5 sm:p-6 mb-8 w-full group transition-all"
            style={{ 
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0d1f3c 100%)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)'
            }}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-1000"
                 style={{ background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)' }}></div>
            
            <button 
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-white/50 hover:text-white/90 transition-colors z-20"
                aria-label="Dismiss"
            >
                <IconX size={20} />
            </button>

            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 relative z-10">
                <div 
                    className="flex items-center justify-center rounded-xl shrink-0 shadow-[0_4px_20px_rgba(139,92,246,0.3)] w-12 h-12"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)' }}
                >
                    <IconCreditCard className="w-6 h-6 text-white" stroke={1.5} />
                </div>
                
                <div className="flex-1 min-w-0 pr-2 sm:pr-6">
                    <h3 className="font-bold mb-1.5 text-white text-[18px] tracking-tight">
                        Get paid faster with Stripe
                    </h3>
                    <p className="mb-5 max-w-xl text-white/75 text-[13.5px] leading-relaxed">
                        Your invoicing is unlocked — set up payments to start accepting online card payments directly to your bank account. Takes about 5 minutes.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleSetup}
                            disabled={isLoading}
                            className="w-full sm:w-auto flex items-center justify-center font-bold rounded-full transition-all duration-200 bg-white text-[#0f0f1a] hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] px-6 py-2.5 text-[14px] disabled:opacity-80 disabled:pointer-events-none shadow-md"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-[#0f0f1a]/30 border-t-[#0f0f1a] rounded-full animate-spin"></div> : 'Set up payments'}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="w-full sm:w-auto text-center font-medium transition-colors py-2 px-1 text-white/60 hover:text-white/90 text-[14px]"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Powered by Stripe badge */}
            <div className="absolute bottom-3 right-4 hidden sm:block opacity-30 select-none pointer-events-none">
                <span className="text-[10px] font-medium tracking-[0.02em] uppercase text-white">
                    Powered by Stripe
                </span>
            </div>
        </div>
    );
}

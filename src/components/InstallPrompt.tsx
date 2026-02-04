"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Check if dismissed previously
        if (localStorage.getItem("pwa-prompt-dismissed")) return;

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        if (ios) {
            // Show prompt for iOS after a small delay
            setTimeout(() => setShowPrompt(true), 3000);
        } else {
            // Android / Desktop - listen for beforeinstallprompt
            const handleBeforeInstallPrompt = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setShowPrompt(true);
            };

            window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

            return () => {
                window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            };
        }
    }, []);

    const dismissPrompt = () => {
        setShowPrompt(false);
        localStorage.setItem("pwa-prompt-dismissed", "true");
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-4 flex items-center justify-between max-w-md mx-auto">
                <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 shadow-sm rounded-xl overflow-hidden">
                        <Image
                            src="/pwa-icon.png"
                            alt="App Icon"
                            width={56}
                            height={56}
                            className="w-14 h-14 object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900">Install Receipt Hub</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isIOS
                                ? "Tap 'Share' then 'Add to Home Screen'"
                                : "Add to home screen for quick access"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center ml-4 space-x-2">
                    {!isIOS && (
                        <button
                            onClick={handleInstallClick}
                            className="bg-gray-900 hover:bg-black text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={dismissPrompt}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* iOS Pointer Helper (optional, subtle) */}
            {isIOS && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-white/90 border-r-[10px] border-r-transparent filter drop-shadow animate-bounce opacity-80" />
            )}
        </div>
    );
}

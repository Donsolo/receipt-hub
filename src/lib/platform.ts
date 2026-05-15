import { useState, useEffect } from 'react';

/**
 * Safely detects if the application is running inside a native Android Capacitor app or an Android WebView.
 * It ensures we only return true for Android to comply with Google Play policies without affecting iOS.
 */
export const isNativeAndroidApp = (): boolean => {
    if (typeof window === 'undefined') return false; // SSR safe

    try {
        // Detect Capacitor injection
        const capacitor = (window as any).Capacitor;
        
        // If Capacitor is present, strictly check that the platform is "android"
        if (capacitor && typeof capacitor.getPlatform === 'function') {
            return capacitor.getPlatform() === 'android';
        }

        // Fallback: Check for Android WebView marker in User Agent
        const ua = window.navigator.userAgent.toLowerCase();
        const isAndroidWebView = ua.includes('android') && ua.includes('wv');

        return isAndroidWebView;
    } catch (e) {
        return false;
    }
};

/**
 * React Hook for hydration-safe native Android platform detection.
 */
export const usePlatform = () => {
    const [isNativeAndroid, setIsNativeAndroid] = useState(false);

    useEffect(() => {
        setIsNativeAndroid(isNativeAndroidApp());
    }, []);

    return { isNativeAndroid };
};

"use client";

import { useEffect } from 'react';
import { isNativeAndroidApp } from '@/lib/platform';

export default function NativeFetchInterceptor() {
    useEffect(() => {
        if (typeof window !== 'undefined' && isNativeAndroidApp()) {
            const originalFetch = window.fetch;
            window.fetch = async function (...args) {
                let [resource, config] = args;
                
                if (!config) {
                    config = {};
                }
                
                if (!config.headers) {
                    config.headers = {};
                }
                
                if (config.headers instanceof Headers) {
                    config.headers.set('x-verihub-platform', 'android-native');
                } else if (Array.isArray(config.headers)) {
                    config.headers.push(['x-verihub-platform', 'android-native']);
                } else {
                    (config.headers as Record<string, string>)['x-verihub-platform'] = 'android-native';
                }
                
                return originalFetch(resource, config);
            };
        }
    }, []);

    return null;
}

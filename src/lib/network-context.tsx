"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

interface NetworkContextType {
    isOnline: boolean;
    connectionType: string;
}

const NetworkContext = createContext<NetworkContextType>({
    isOnline: true,
    connectionType: 'unknown',
});

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<ConnectionStatus>({
        connected: true,
        connectionType: 'unknown',
    });

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                if (Capacitor.isNativePlatform()) {
                    const currentStatus = await Network.getStatus();
                    if (!cancelled) setStatus(currentStatus);

                    await Network.addListener('networkStatusChange', (newStatus) => {
                        if (!cancelled) setStatus(newStatus);
                    });
                } else {
                    // For web, use standard navigator.onLine as fallback
                    const handleOnline = () => { if (!cancelled) setStatus({ connected: true, connectionType: 'wifi' }); };
                    const handleOffline = () => { if (!cancelled) setStatus({ connected: false, connectionType: 'none' }); };
                    
                    window.addEventListener('online', handleOnline);
                    window.addEventListener('offline', handleOffline);
                    
                    if (!cancelled) setStatus({ connected: navigator.onLine, connectionType: navigator.onLine ? 'wifi' : 'none' });

                    return () => {
                        window.removeEventListener('online', handleOnline);
                        window.removeEventListener('offline', handleOffline);
                    };
                }
            } catch (err) {
                console.error('[Network] Status check failed:', err);
                // Default to online if check fails — better UX than blocking the app
                if (!cancelled) setStatus({ connected: true, connectionType: 'unknown' });
            }
        };

        const cleanupWeb = init();

        return () => {
            cancelled = true;
            if (Capacitor.isNativePlatform()) {
                Network.removeAllListeners();
            } else {
                cleanupWeb.then(cleanup => cleanup && cleanup());
            }
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline: status.connected, connectionType: status.connectionType }}>
            {children}
        </NetworkContext.Provider>
    );
}

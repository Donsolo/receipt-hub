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
        if (!Capacitor.isNativePlatform()) {
            // For web, use standard navigator.onLine as fallback
            const handleOnline = () => setStatus({ connected: true, connectionType: 'wifi' });
            const handleOffline = () => setStatus({ connected: false, connectionType: 'none' });
            
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            
            setStatus({ connected: navigator.onLine, connectionType: navigator.onLine ? 'wifi' : 'none' });

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        const initNetwork = async () => {
            const initialStatus = await Network.getStatus();
            setStatus(initialStatus);
        };

        initNetwork();

        const handler = Network.addListener('networkStatusChange', (status) => {
            setStatus(status);
        });

        return () => {
            handler.then(h => h.remove());
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline: status.connected, connectionType: status.connectionType }}>
            {children}
        </NetworkContext.Provider>
    );
}

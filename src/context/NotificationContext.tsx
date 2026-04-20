"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    read: boolean;
    createdAt: string;
}

interface NotificationContextProps {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (isOpen: boolean) => void;
    refresh: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    
    const { requestPermissions } = usePushNotifications();

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            // Silent catch to prevent console spam during network disconnections or unauthenticated state
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications/unread-count');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count || 0);
            }
        } catch (error) {
            // Silent catch to prevent console spam
        }
    }, []);

    const refresh = useCallback(async () => {
        await Promise.all([fetchNotifications(), fetchUnreadCount()]);
        setLoading(false);
    }, [fetchNotifications, fetchUnreadCount]);

    const markRead = async (id: string) => {
        try {
            // Optimistic upate UI
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            const res = await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id }),
            });

            if (!res.ok) {
                // Revert on failure
                refresh();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            refresh();
        }
    };

    const markAllRead = async () => {
        try {
            // Optimistic update UI
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            const res = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
            });

            if (!res.ok) {
                // Revert on failure
                refresh();
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            refresh();
        }
    };

    useEffect(() => {
        refresh();
        
        // Contextually request native PUSH permission gracefully after 3.5 seconds
        const promptTimer = setTimeout(() => {
            requestPermissions();
        }, 3500);

        // Poll every 30 seconds
        const intervalId = setInterval(() => {
            refresh();
        }, 30000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(promptTimer);
        };
    }, [refresh, requestPermissions]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            isDrawerOpen,
            setIsDrawerOpen,
            refresh,
            markRead,
            markAllRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

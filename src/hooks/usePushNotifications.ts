'use client';

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth-client';

function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [token, setToken] = useState<string | null>(null);
    const [foregroundNotification, setForegroundNotification] = useState<{ title: string, body: string } | null>(null);
    const router = useRouter();

    const registerPushToken = async (hardwareToken: string, platformType: string) => {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...((await getAuthHeader()) as any) },
                body: JSON.stringify({
                    token: hardwareToken,
                    platform: platformType,
                }),
            });
            console.log(`Successfully registered Push Token (${platformType}) with Verihub backend.`);
        } catch (error) {
            console.error('Failed to sync push token to backend:', error);
        }
    };

    const requestPermissions = useCallback(async () => {
        if (Capacitor.isNativePlatform()) {
            const { receive } = await PushNotifications.requestPermissions();
            if (receive === 'granted') {
                await PushNotifications.register();
                return true;
            }
            return false;
        } else {
            // WEB PUSH LOGIC (PWA)
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('Web Push not supported in this browser.');
                return false;
            }
            
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
                
                const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                if (!vapidPublicKey) {
                    console.error('VAPID public key not found.');
                    return false;
                }

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
                });
                
                const tokenStr = JSON.stringify(subscription);
                setToken(tokenStr);
                await registerPushToken(tokenStr, 'web');
                return true;
            } catch (error) {
                console.error('Failed to subscribe to Web Push:', error);
                return false;
            }
        }
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let isMounted = true;

        const initializePush = async () => {
            const status = await PushNotifications.checkPermissions();
            if (status.receive === 'prompt') {
                const requested = await PushNotifications.requestPermissions();
                if (requested.receive === 'granted') {
                    PushNotifications.register();
                }
            } else if (status.receive === 'granted') {
                PushNotifications.register();
            }

            // Hook up listeners
            PushNotifications.addListener('registration', (t: Token) => {
                if (isMounted) {
                    setToken(t.value);
                    registerPushToken(t.value, 'android');
                }
            });

            PushNotifications.addListener('registrationError', (error: any) => {
                console.error('Push registration error: ' + JSON.stringify(error));
            });

            // When a notification is received in the foreground
            PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
                console.log('Push notification received: ', notification);
                if (isMounted) {
                    setForegroundNotification({
                        title: notification.title || 'New Notification',
                        body: notification.body || ''
                    });
                    setTimeout(() => {
                        if (isMounted) setForegroundNotification(null);
                    }, 5000);
                }
            });

            // When a user taps on a notification from the OS drawer
            PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
                console.log('Push action performed: ', action);
                const routeTarget = action.notification.data?.route;
                if (routeTarget) {
                    router.push(routeTarget);
                }
            });
        };

        initializePush();

        return () => {
            isMounted = false;
            PushNotifications.removeAllListeners();
        };
    }, [router]);

    return { token, requestPermissions, foregroundNotification };
}


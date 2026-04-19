'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { useRouter } from 'next/navigation';

export function usePushNotifications() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    const registerPushToken = async (hardwareToken: string) => {
        try {
            await fetch('/api/user/push-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: hardwareToken,
                    platform: Capacitor.getPlatform(),
                }),
            });
            console.log('Successfully registered Push Token with Verihub backend.');
        } catch (error) {
            console.error('Failed to sync native push token to backend:', error);
        }
    };

    const requestPermissions = async () => {
        if (!Capacitor.isNativePlatform()) return false;

        const { receive } = await PushNotifications.requestPermissions();
        if (receive === 'granted') {
            await PushNotifications.register();
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let isMounted = true;

        const initializePush = async () => {
            // Check status without explicitly prompting unless it's already 'granted'
            const status = await PushNotifications.checkPermissions();
            if (status.receive === 'granted') {
                PushNotifications.register();
            }

            // Hook up listeners
            PushNotifications.addListener('registration', (token: Token) => {
                if (isMounted) {
                    setToken(token.value);
                    registerPushToken(token.value);
                }
            });

            PushNotifications.addListener('registrationError', (error: any) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            });

            // When a notification is received in the foreground
            PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
                console.log('Push notification received: ', notification);
                // Optionally dispatch localized toast or UI update here
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
    }, []);

    return { token, requestPermissions };
}

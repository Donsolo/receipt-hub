import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'auth_token';

export async function storeAuthToken(token: string) {
    if (Capacitor.isNativePlatform()) {
        await Preferences.set({
            key: TOKEN_KEY,
            value: token
        });
    }
}

export async function removeAuthToken() {
    if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: TOKEN_KEY });
    }
}

export async function getAuthHeader(): Promise<HeadersInit> {
    if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: TOKEN_KEY });
        if (value) {
            return { Authorization: `Bearer ${value}` };
        }
    }
    return {};
}

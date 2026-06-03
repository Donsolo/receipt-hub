import { Preferences } from '@capacitor/preferences';

interface CacheEntry<T> {
    timestamp: number;
    data: T;
}

export async function getCached<T>(key: string, maxAgeMs: number): Promise<T | null> {
    try {
        const { value } = await Preferences.get({ key: `api_cache_${key}` });
        if (!value) return null;

        const entry: CacheEntry<T> = JSON.parse(value);
        const age = Date.now() - entry.timestamp;

        if (age > maxAgeMs) {
            // Expired
            await Preferences.remove({ key: `api_cache_${key}` });
            return null;
        }

        return entry.data;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

export async function setCached<T>(key: string, data: T): Promise<void> {
    try {
        const entry: CacheEntry<T> = {
            timestamp: Date.now(),
            data,
        };
        await Preferences.set({
            key: `api_cache_${key}`,
            value: JSON.stringify(entry),
        });
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
}

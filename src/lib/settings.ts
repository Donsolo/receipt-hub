import { db } from './db';

// Cache settings in memory on the server for fast reads
let settingsCache: Record<string, string> = {};
let lastFetch = 0;
const CACHE_TTL_MS = 60000; // 1 minute

export async function getSystemSettings() {
    const now = Date.now();
    // Return cache if valid
    if (Object.keys(settingsCache).length > 0 && (now - lastFetch < CACHE_TTL_MS)) {
        return {
            REQUIRE_ACTIVATION: settingsCache.REQUIRE_ACTIVATION === 'true',
            EARLY_ACCESS_OPEN: settingsCache.EARLY_ACCESS_OPEN === 'true',
        };
    }

    try {
        const settings = await (db as any).systemSetting.findMany();

        // Convert array to object
        const map: Record<string, string> = {};
        for (const s of settings) {
            map[s.key] = s.value;
        }

        // Initialize defaults if missing in DB
        if (map.REQUIRE_ACTIVATION === undefined) {
            await (db as any).systemSetting.create({ data: { key: 'REQUIRE_ACTIVATION', value: 'false' } });
            map.REQUIRE_ACTIVATION = 'false';
        }
        if (map.EARLY_ACCESS_OPEN === undefined) {
            await (db as any).systemSetting.create({ data: { key: 'EARLY_ACCESS_OPEN', value: 'true' } });
            map.EARLY_ACCESS_OPEN = 'true';
        }

        // Update cache
        settingsCache = map;
        lastFetch = now;

        return {
            REQUIRE_ACTIVATION: map.REQUIRE_ACTIVATION === 'true',
            EARLY_ACCESS_OPEN: map.EARLY_ACCESS_OPEN === 'true',
        };
    } catch (error) {
        console.error('Failed to fetch system settings, falling back to defaults:', error);
        return {
            REQUIRE_ACTIVATION: false,
            EARLY_ACCESS_OPEN: true,
        };
    }
}

export async function clearSettingsCache() {
    settingsCache = {};
    lastFetch = 0;
}

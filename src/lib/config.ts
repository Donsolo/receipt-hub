export const isNative = typeof window !== 'undefined' &&
    (window.location.origin.startsWith('capacitor://') ||
     window.location.origin === 'https://localhost');

export const API_BASE_URL = isNative ? 'https://verihub.app' : '';

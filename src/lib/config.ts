export const isNative = typeof window !== 'undefined' && 
    (window.location.origin.startsWith('capacitor://') || 
     window.location.origin === 'https://localhost' || 
     window.location.origin === 'http://localhost' ||
     (window as any).Capacitor?.isNative);

export const API_BASE_URL = isNative ? 'https://verihub.app' : '';

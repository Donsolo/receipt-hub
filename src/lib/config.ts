export const isNative = typeof window !== 'undefined' && 
    (!!(window as any).Capacitor?.isNative || 
     window.location.origin.startsWith('capacitor://') || 
     window.location.origin === 'https://localhost' || 
     window.location.origin === 'http://localhost');

export const API_BASE_URL = isNative ? 'https://verihub.app' : '';

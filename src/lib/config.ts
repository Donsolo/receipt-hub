export const isNative = typeof window !== 'undefined' && 
    (process.env.NEXT_PUBLIC_IS_MOBILE === 'true' ||
     !!(window as any).Capacitor?.isNative || 
     window.location.origin.startsWith('capacitor://') || 
     window.location.origin === 'https://localhost' || 
     window.location.origin === 'http://localhost');

export const API_BASE_URL = (isNative || process.env.NEXT_PUBLIC_IS_MOBILE === 'true') ? 'https://verihub.app' : '';

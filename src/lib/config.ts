export const isNative = typeof window !== 'undefined' && 
    (window.location.origin.startsWith('capacitor://') || 
     window.location.origin === 'https://localhost' || 
     (window as any).Capacitor?.isNative);

export const API_BASE_URL = isNative
    ? process.env.NEXT_PUBLIC_API_URL ?? 'https://verihub.app'
    : '';

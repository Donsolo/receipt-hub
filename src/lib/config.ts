export const isNative = typeof window !== 'undefined' &&
    (window.location.origin.includes('capacitor://') ||
     window.location.origin.includes('localhost'));

export const API_BASE_URL = isNative
    ? process.env.NEXT_PUBLIC_API_URL ?? 'https://verihub.app'
    : '';

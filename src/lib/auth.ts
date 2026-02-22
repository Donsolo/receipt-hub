import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-in-prod';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    isActivated?: boolean;
    isEarlyAccess?: boolean;
    activationSource?: string | null;
    [key: string]: any; // Jose requires Index signature
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secretKey);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey);
        return payload as JWTPayload;
    } catch (error) {
        return null;
    }
}

import { getSystemSettings } from '@/lib/settings';

export async function ensureActivated(user: JWTPayload) {
    const settings = await getSystemSettings();
    if (settings.REQUIRE_ACTIVATION) {
        if (
            user.isActivated === false &&
            user.isEarlyAccess !== true &&
            user.activationSource !== 'admin' &&
            user.activationSource !== 'beta'
        ) {
            throw new Error('CORE_ACTIVATION_REQUIRED');
        }
    }
}
import { serialize } from 'cookie';

export function createAuthCookie(token: string) {
    return serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

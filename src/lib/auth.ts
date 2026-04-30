import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-in-prod';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    plan?: string;
    planStatus?: string | null;
    isActivated?: boolean;
    isEarlyAccess?: boolean;
    activationSource?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: Date | null;
    [key: string]: any; // Jose requires Index signature
}

export function canUseProFeature(user: JWTPayload): boolean {
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
    return user.plan === 'PRO';
}

export function canUseOCR(user: JWTPayload): boolean {
    return canUseProFeature(user);
}

export function canUseBusinessLogo(user: JWTPayload): boolean {
    return canUseProFeature(user);
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
export async function isAdmin(userId: string): Promise<boolean> {
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}

import { serialize } from 'cookie';

export function createAuthCookie(token: string) {
    return serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

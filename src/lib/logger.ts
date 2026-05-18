/**
 * logger.ts
 * 
 * Lightweight structured logger for Verihub production hardening.
 * Automatically masks known sensitive fields and supports future Sentry integration.
 * 
 * TODO: If SENTRY_DSN is configured, initialize @sentry/nextjs here or in root layout.
 */

const isDev = process.env.NODE_ENV === 'development';

interface LogContext {
    userId?: string;
    invoiceId?: string;
    route?: string;
    [key: string]: any;
}

// Fields that should never be logged raw
const SENSITIVE_KEYS = ['card', 'cvc', 'password', 'token', 'secret', 'stripe_secret_key'];

function maskSensitiveData(obj: any): any {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(maskSensitiveData);
    }

    const masked: any = {};
    for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk))) {
            masked[k] = '[REDACTED]';
        } else if (typeof v === 'object') {
            masked[k] = maskSensitiveData(v);
        } else {
            masked[k] = v;
        }
    }
    return masked;
}

export const logger = {
    info: (message: string, context?: LogContext) => {
        const safeContext = maskSensitiveData(context);
        if (isDev) {
            console.log(`[INFO] ${message}`, safeContext || '');
        } else {
            console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...safeContext }));
        }
    },
    
    warn: (message: string, context?: LogContext) => {
        const safeContext = maskSensitiveData(context);
        if (isDev) {
            console.warn(`[WARN] ${message}`, safeContext || '');
        } else {
            console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...safeContext }));
        }
    },
    
    error: (message: string, error?: any, context?: LogContext) => {
        const safeContext = maskSensitiveData(context);
        const errMeta = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
        
        if (isDev) {
            console.error(`[ERROR] ${message}`, errMeta, safeContext || '');
        } else {
            console.error(JSON.stringify({ level: 'error', message, error: errMeta, timestamp: new Date().toISOString(), ...safeContext }));
        }

        // TODO: Sentry.captureException(error, { extra: safeContext });
    }
};

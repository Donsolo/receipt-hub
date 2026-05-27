/**
 * env.ts
 * 
 * Centralized environment variable validation for Verihub production readiness.
 */

import { logger } from './logger';

const REQUIRED_VARS = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
];

const OPTIONAL_VARS = [
    'SENTRY_DSN',
    'SMS_PROVIDER',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
    'CRON_SECRET',
    'INTERNAL_JOB_SECRET',
    'STRIPE_TEST_SECRET_KEY',
    'STRIPE_TEST_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY',
    'INVOICE_PAYMENTS_STRIPE_MODE'
];

export function validateEnv() {
    let hasErrors = false;

    // Check required
    for (const key of REQUIRED_VARS) {
        if (!process.env[key]) {
            logger.error(`[ENV VALIDATION] Missing required environment variable: ${key}`);
            hasErrors = true;
        }
    }

    if (hasErrors && process.env.NODE_ENV === 'production') {
        logger.error(`[ENV VALIDATION] CRITICAL: Verihub is booting in production without required environment variables.`);
        // In some strict environments, you might throw here to crash the boot.
        // throw new Error("Missing required environment variables.");
    }

    // Check optional
    for (const key of OPTIONAL_VARS) {
        if (!process.env[key]) {
            logger.warn(`[ENV VALIDATION] Missing optional environment variable: ${key}`);
        }
    }
}

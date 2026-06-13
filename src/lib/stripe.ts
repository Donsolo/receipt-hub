import Stripe from 'stripe';

export function getStripeInstance(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('STRIPE_SECRET_KEY is required for Pro subscription billing.');
    }
    return new Stripe(key, {
        apiVersion: '2026-01-28.clover' as any,
        typescript: true,
        appInfo: { name: 'Verihub', version: '1.0.0' },
    });
}

/**
 * Returns a Stripe instance specifically for Invoice Payment Checkout.
 * Pro billing subscriptions ALWAYS use the default `stripe` export above.
 * 
 * Logic:
 * - If INVOICE_PAYMENTS_STRIPE_MODE is explicitly set, use it.
 * - Otherwise, in production, use 'live'.
 * - In dev/preview with a test key, use 'test'.
 */
export function getInvoiceStripeInstance(): { stripeInstance: Stripe, mode: 'live' | 'test' } {
    const explicitMode = process.env.INVOICE_PAYMENTS_STRIPE_MODE;
    const isProd = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';
    const testKeyAvailable = !!process.env.STRIPE_TEST_SECRET_KEY;
    
    let mode: 'live' | 'test' = 'live';
    
    if (explicitMode === 'test') {
        mode = 'test';
    } else if (explicitMode === 'live') {
        mode = 'live';
    } else if (!isProd && testKeyAvailable) {
        mode = 'test';
    }
    
    if (mode === 'test') {
        const testKey = process.env.STRIPE_TEST_SECRET_KEY;
        if (!testKey) {
            throw new Error('STRIPE_TEST_SECRET_KEY is required for test mode invoice payments. Add it to your .env file.');
        }
        return {
            stripeInstance: new Stripe(testKey, {
                apiVersion: '2026-01-28.clover' as any,
                typescript: true,
                appInfo: { name: 'Verihub QA', version: '1.0.0' },
            }),
            mode
        };
    } else {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is missing but live mode was requested for invoice payments.');
        }
        return {
            stripeInstance: getStripeInstance(), // Reuse existing live instance
            mode
        };
    }
}

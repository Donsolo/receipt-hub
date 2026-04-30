import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY. Please set it in your environment.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-01-28.clover' as any,
    typescript: true,
    appInfo: {
        name: 'Verihub',
        version: '1.0.0',
    },
});

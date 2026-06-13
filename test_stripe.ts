import 'dotenv/config';
import { Stripe } from 'stripe';

async function testStripe() {
    console.log('Testing Stripe API...');
    const testKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    
    if (!testKey) {
        console.error('No Stripe key found in environment.');
        return;
    }
    
    console.log('Using key starting with:', testKey.substring(0, 12) + '...');
    
    const stripe = new Stripe(testKey, {
        apiVersion: '2026-01-28.clover' as any,
    });
    
    try {
        console.log('Attempting to list accounts...');
        const accounts = await stripe.accounts.list({ limit: 1 });
        console.log('Success! Found accounts:', accounts.data.length);
        
        console.log('Attempting to create an express account...');
        const newAccount = await stripe.accounts.create({
            type: 'express',
            email: 'test_connect@example.com'
        });
        console.log('Successfully created account:', newAccount.id);
        
    } catch (error: any) {
        console.error('\n--- STRIPE ERROR ---');
        console.error('Type:', error.type);
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('--------------------\n');
    }
}

testStripe().catch(console.error);

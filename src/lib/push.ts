import * as admin from 'firebase-admin';
import webpush from 'web-push';

// Initialize Web Push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@tektriq.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('WARNING: VAPID keys are missing. Web Push notifications cannot be sent.');
}

// Initialize Firebase Admin seamlessly avoiding duplicate instances in Next.js development
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully in Push Service.');
    } else {
      console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. Native push notifications cannot be sent.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin payload router:', error);
  }
}

export type Payload = {
  title: string;
  body: string;
  data?: Record<string, string>; // Deep links natively (e.g. "/dashboard/invoices")
};

/**
 * Dispatch an over-the-air push notification to an array of cached device tokens safely.
 * Routes VAPID JSON tokens to Web Push and raw string tokens to FCM.
 */
export async function sendNativePush(tokens: string[], payload: Payload) {
  if (tokens.length === 0) return { success: 0, failure: 0 };

  const webTokens: any[] = [];
  const nativeTokens: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('{') && token.includes('endpoint')) {
      try {
        webTokens.push(JSON.parse(token));
      } catch (e) {
        // invalid token
      }
    } else {
      nativeTokens.push(token);
    }
  }

  let successCount = 0;
  let failureCount = 0;

  // 1. Dispatch Web Push
  if (webTokens.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    const webPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data
    });

    const webPromises = webTokens.map(sub => 
      webpush.sendNotification(sub, webPayload).then(() => {
        successCount++;
      }).catch(err => {
        console.error('Web Push failed:', err);
        failureCount++;
      })
    );
    await Promise.all(webPromises);
  }

  // 2. Dispatch Native FCM
  if (nativeTokens.length > 0 && admin.apps.length) {
    try {
      const messagingResult = await admin.messaging().sendEachForMulticast({
        tokens: nativeTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      });

      successCount += messagingResult.successCount;
      failureCount += messagingResult.failureCount;

      if (messagingResult.failureCount > 0) {
        console.log(`FCM Delivery Warning: ${messagingResult.failureCount} tokens failed to route.`);
      }
    } catch (error) {
      console.error('Fatal native push dispatch failure:', error);
      failureCount += nativeTokens.length;
    }
  }

  return { success: successCount, failure: failureCount };
}

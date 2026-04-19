import * as admin from 'firebase-admin';

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
      console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. Push notifications cannot be sent.');
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
 */
export async function sendNativePush(tokens: string[], payload: Payload) {
  if (!admin.apps.length || tokens.length === 0) return { success: 0, failure: 0 };

  try {
    const messagingResult = await admin.messaging().sendEachForMulticast({
      tokens,
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

    // Optionally handle cleanup of dead tokens here if routing failed due to token revocation
    if (messagingResult.failureCount > 0) {
      console.log(`FCM Delivery Warning: ${messagingResult.failureCount} tokens failed to route.`);
    }

    return { success: messagingResult.successCount, failure: messagingResult.failureCount };
  } catch (error) {
    console.error('Fatal native push dispatch failure:', error);
    return { success: 0, failure: tokens.length };
  }
}

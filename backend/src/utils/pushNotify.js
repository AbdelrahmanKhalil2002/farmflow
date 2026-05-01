/**
 * Firebase push notification helper.
 * Never throws — a push failure should never break the main request.
 */
const User = require('../models/User');

let admin = null;

// Initialize firebase-admin from the env var — skip gracefully if missing
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (err) {
    console.warn('[pushNotify] Failed to initialize firebase-admin:', err.message);
    admin = null;
  }
} else {
  console.warn('[pushNotify] FIREBASE_SERVICE_ACCOUNT_JSON is not set — push notifications disabled.');
}

/**
 * Send a Firebase push notification to a single user.
 *
 * @param {string|ObjectId} userId
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 */
const sendPush = async (userId, { title, body, data = {} }) => {
  if (!admin) return;

  try {
    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user || !user.fcmToken) return;

    const message = {
      token: user.fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };

    await admin.messaging().send(message);
  } catch (err) {
    console.error('[pushNotify] Failed to send push notification:', err.message);
  }
};

module.exports = { sendPush };

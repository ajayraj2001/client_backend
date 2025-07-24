const admin = require('firebase-admin');

// Initialize Firebase
const serviceAccount = require('../../config/astrosetu-c1f31-firebase-adminsdk-fbsvc-96367c91b7.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Send Firebase Push Notification
 * @param {String[]|String} tokens - A single token or an array of tokens
 * @param {Object} payload - { title, body, image }
 */
const sendPushNotification = async (tokens, payload) => {
  // Normalize single token to array
  const deviceTokens = Array.isArray(tokens) ? tokens : [tokens];

  if (!deviceTokens.length) {
    console.log('No device tokens provided');
    return;
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.image || undefined
    },
    tokens: deviceTokens
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`Notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('Firebase Notification Error:', error);
    return null;
  }
};

module.exports = { sendPushNotification };

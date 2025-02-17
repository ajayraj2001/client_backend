const admin = require('firebase-admin');
const path = require('path');

// Load Firebase service account credentials
const serviceAccount = require('../../config/astro-setu-232cc-firebase-adminsdk-xjsbm-aa4a98a27e.json');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

/**
 * Send push notification via Firebase Cloud Messaging (FCM)
 * @param {string} deviceToken - Recipient's FCM device token
 * @param {object} payload - Notification payload with title and body
 * @param {object} [data] - Additional data to send with the notification
 * @returns {Promise<object>} - Firebase response
 */
const sendFCMNotification = async (deviceToken, payload, data = {}) => {
  try {
    console.log('payload', payload);
    console.log('data', data);

    // Prepare the notification message
    const message = {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body
      },
      // Include user_info in the data payload
      data: {
        ...data,  // Spread any additional data
        call_type: payload.call_type,  // Include call type in data
        user_info: JSON.stringify(payload.user_info)  // Serialize user_info as JSON
      },
      android: {
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true
          }
        }
      }
    };

    // Send the notification
    const response = await admin.messaging().send(message);
    console.log('FCM Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    throw error;
  }
};

// Static call to sendFCMNotification with a predefined payload including user_info
sendFCMNotification(
  "edPZCkOmQAG2wXQs1IMcdK:APA91bGLJAb0rzEquictA-9IuG1RrDojKoHxVGFsUa6ldMuYvZOs4kfxUdgC3qcZER4qk2-8AtvzU6xOsjTTFVszf5dKMdmAnQqMhVTnV5FP9gjotLNAAvs",
  {
    title: 'Incoming Call',  // Notification title
    call_type: 'chat',  // Type of the call (chat in this case)
    body: 'You have an incoming call',  // Message body
    user_info: {  // Include user-related information
      name: 'John Doe',  // Example user name
      number: '+1234567890',  // Example phone number
      profile_img: 'https://example.com/profile.jpg'  // Example profile image URL
    }
  }
);


module.exports = { sendFCMNotification };

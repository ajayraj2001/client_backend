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
const sendFCMNotification = async (deviceToken, payload) => {
  try {
    console.log('payload', payload);
    // console.log('data', data);

    // Prepare the notification message
    const message = {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body
      },
      // Include user_info in the data payload
      data: {
        call_id: payload.call_id || '67aa2bd5e588b1080e03a2c9', // Static call ID
        call_type: payload.call_type || 'chat', // Static call type  // Spread any additional data
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

// sendFCMNotification('edPZCkOmQAG2wXQs1IMcdK:APA91bGLJAb0rzEquictA-9IuG1RrDojKoHxVGFsUa6ldMuYvZOs4kfxUdgC3qcZER4qk2-8AtvzU6xOsjTTFVszf5dKMdmAnQqMhVTnV5FP9gjotLNAAvs', {
//   title: 'Incoming Call', // Static title
//   body: 'You have an incoming call', // Static body
//   call_id: '67aa2bd5e588b1080e03a2c9', // Static call ID
//   call_type: 'chat', // Static call type
//   user_info: { // Static user info
//     name: 'John Doe',
//     number: '+1234567890',
//     profile_img: '/astro_profile_images/1739777163175.jpg',
//   },
// });

module.exports = { sendFCMNotification };

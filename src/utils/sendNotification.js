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


// const deviceToken = "chwPUrP7R7qnxE1LGD-LXf:APA91bHoRtvoyqkF0QxgRSQDK35mFFOms-i9PX6LRGL06QUBTbNboSSNIy5_vZNBSVlKk_KVEFPGzi1q5rzqhilFACjpcoqKXZhe8hBSEISI2m6MTnWuleU"
// const call_type = "chat"
// (async () => {
//   const deviceToken = "f8n4nzdKRb-SZJCuSR4YDm:APA91bGlb1KRBTmf_jN7S5mgBCvWu89UGBO6bmZ3qqBHbOBi7LjlSEQItOWtL8jtSQjqhHqYtDWsQ6nj2PZdzlQeDT45_f0Q8J5pcpEwvJex7FNbp8tBoSE"
//   const call_type = "chat";

//   await sendFCMNotification(deviceToken, {
//     title: 'Incoming Call',
//     body: `Incoming ${call_type} call from user`,
//     call_id: '3213123',
//     call_type,
//     maximum_minutes: "10",
//     user_info: {
//       user_id: "1123213",
//       name: "Ajay Raj",
//       profile_img: ""
//     }
//   });
// })();

module.exports = { sendFCMNotification };

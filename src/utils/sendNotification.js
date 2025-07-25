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
  const deviceTokens = Array.isArray(tokens) ? tokens : [tokens];


  console.log('deviceTokens', deviceTokens)
  console.log('payload', payload)
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
    data: {
      type: payload.type || '',
      type_ref_id: payload.type_ref_id || '',
      image: payload.image || '',
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // Important for Flutter
    },
    tokens: deviceTokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('Firebase Notification Error:', error);
    return null;
  }
};

// Test static push
// const test = async () => {
//   const testDeviceToken = 'fMXG_fLAT8m-rmgZGCK5-B:APA91bES9uVsXtY0tlfx0YpM3bkR-b-ovR664d55K6PXFKPdCFzVXBtbd9sbobsyomoP9g_8GcDkybKGsFkhorpXHQ4LsxuUv3XZZOWvYyOu88RjlmHBCAc';

//   // const payload = {
//   //   title: '🚀 Test Notification',
//   //   body: 'This is a test push from Firebase!',
//   //   image: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' // Optional image
//   // };

//   const payload = {
//     title: 'Puja',
//     body: 'THIs is the New Puja',
//     image: 'https://www.astrosetu.com/public/puja_images/pujaImage-1751366408544-22976895.jpeg', // Optional image
//     type: "Puja",
//     type_ref_id: '6863bb08cb258398f790e2c6'
//   };

//   await sendPushNotification(testDeviceToken, payload);
// };

// // Run test if this file is executed directly
// if (require.main === module) {
//   test();
// }

module.exports = { sendPushNotification };

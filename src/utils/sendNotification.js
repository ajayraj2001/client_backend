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
        const message = {
            token: deviceToken,
            notification: {
                title: payload.title,
                body: payload.body
            },
            data: data,
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

        const response = await admin.messaging().send(message);
        console.log('FCM Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending FCM notification:', error);
        throw error;
    }
};

module.exports = { sendFCMNotification };

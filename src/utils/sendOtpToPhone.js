const axios = require('axios');

/**
 * Sends OTP to the user's mobile number.
 * @param {string} otpUrl - The URL for sending the OTP.
 * @returns {Promise<void>} A promise that resolves when the OTP is sent.
 */
const sendOTP = async (otpUrl) => {
  try {
    const response = await axios.get(otpUrl);
    console.log('OTP sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    throw new Error('Failed to send OTP');
  }
};

module.exports = { sendOTP };
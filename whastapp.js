// Bulk WhatsApp Message Sender using Exotel API
const https = require('https');

// API credentials from the screenshots
const API_KEY = 'f5b5c583d4a3f000ae3a623e8eed1ef892d8210c34dd8b41';
const API_TOKEN = '83a415017b3f1f6ff4b91348693c42e8dfdd3819d627c4';
const SUBDOMAIN = 'api.exotel.com';
const ACCOUNT_SID = 'plannit1';
const REGION = 'Singapore'; // Keeping as per your account settings

// Phone numbers
const FROM_NUMBER = '+919886002026'; // The sender number
const RECIPIENT_NUMBERS = ['+918851780462', '+919899981720']; // The recipient numbers

// Function to send WhatsApp messages to multiple recipients
function sendBulkWhatsAppMessages(message, recipientNumbers) {
  return new Promise((resolve, reject) => {
    // Prepare messages for each recipient
    const messages = recipientNumbers.map(recipientNumber => ({
      from: FROM_NUMBER,
      to: recipientNumber,
      content: {
        recipient_type: "individual",
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      }
    }));

    // Prepare request data
    const data = JSON.stringify({
      custom_data: "bulk_message_batch",
      status_callback: "https://your-webhook-url.com/callback", // Replace with your webhook URL if needed
      whatsapp: {
        messages: messages
      }
    });

    // Request options
    const options = {
      hostname: SUBDOMAIN,
      path: `/v2/accounts/${ACCOUNT_SID}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': 'Basic ' + Buffer.from(`${API_KEY}:${API_TOKEN}`).toString('base64')
      }
    };

    // Make the request
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('API Response:', parsedData);
          resolve(parsedData);
        } catch (e) {
          console.log('Raw response:', responseData);
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error sending messages:', error);
      reject(error);
    });

    // Write data to request body
    req.write(data);
    req.end();
  });
}

// Example usage: Sending the same message to multiple recipients
async function main() {
  try {
    // The message to send to all recipients
    const messageText = 'Hello! This is a test message from our WhatsApp API integration.';
    
    console.log(`Sending WhatsApp message to ${RECIPIENT_NUMBERS.length} recipients...`);
    const result = await sendBulkWhatsAppMessages(messageText, RECIPIENT_NUMBERS);
    console.log('Messages sent successfully:', result);
  } catch (error) {
    console.error('Failed to send messages:', error);
  }
}

// Run the example
main();
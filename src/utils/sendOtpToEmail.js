const nodemailer = require('nodemailer');

const sendOtpEmail = async (recipientEmail, otp) => {
  try {
    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // You can use other services like Outlook, Yahoo, etc.
      auth: {
        user: 'ajayraj072001@gmail.com', // Your email address
        pass: 'qrik ybhq spsj tyrk', // Your email password or an app password if 2FA is enabled
      },
    });

    // Set up email options
    const mailOptions = {
      from: 'ajayraj072001@gmail.com', // Sender address
      to: recipientEmail, // List of recipients
      subject: 'Your OTP for Password Reset', // Subject line
      html: `Your OTP for password reset is: <strong>${otp}</strong>. This OTP is valid for 2 minutes.`, // HTML body with bold OTP
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = sendOtpEmail;

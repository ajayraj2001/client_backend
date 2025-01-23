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
      html: `Your OTP for password reset is: <strong>${otp}</strong>. This OTP is valid for 5 minutes.`, // HTML body with bold OTP
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

const sendLoginCredentials = async (recipientEmail, dob) => {
  try {
    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // You can use other services like Outlook, Yahoo, etc.
      auth: {
        user: 'ajayraj072001@gmail.com', // Your email address
        pass: 'qrik ybhq spsj tyrk', // Your email password or an app password if 2FA is enabled
      },
    });

    // Extract the year from DOB (assuming format is DD-MM-YYYY)
    const year = dob.split('-')[2]; // Extracts the year part (e.g., "2001")

    // Set up email options
    const mailOptions = {
      from: 'ajayraj072001@gmail.com', // Sender address
      to: recipientEmail, // List of recipients
      subject: 'Your Login Credentials', // Subject line
      html: `
        <p>Your account has been approved. Here are your login credentials:</p>
        <p><strong>Email:</strong> ${recipientEmail}</p>
        <p><strong>Password Hint:</strong> Your password is a combination of your birth year and the first four digits of your Aadhar card number, separated by an "@" symbol.</p>
        <p>For example, if your birth year is <strong>${year}</strong> and your Aadhar card number starts with <strong>XXXX</strong>, your password would be <strong>${year}@XXXX</strong>.</p>
        <p>Please use these credentials to log in to your account.</p>
        <p>If you did not request this, please contact support immediately.</p>
      `, // HTML body with password hint
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Login credentials email sent successfully');
  } catch (error) {
    console.error('Error sending login credentials email:', error);
    throw new Error('Failed to send login credentials email');
  }
};

const notifyAstrologer = async (recipientEmail, rejectionReason) => {
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
      to: recipientEmail, // Recipient email address
      subject: 'Your Signup Request Has Been Rejected', // Subject line
      html: `
        <p>We regret to inform you that your signup request has been rejected.</p>
        <p><strong>Reason for Rejection:</strong> ${rejectionReason}</p>
        <p>If you believe this is a mistake or would like to reapply, please ensure that all the information you provide is accurate and complete.</p>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br>Support Team</p>
      `, // HTML body with rejection reason
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Rejection email sent successfully');
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw new Error('Failed to send rejection email');
  }
};


module.exports = {sendOtpEmail, sendLoginCredentials, notifyAstrologer};

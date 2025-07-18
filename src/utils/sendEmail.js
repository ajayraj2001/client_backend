const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmailOTP = async (to, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
      <img src="https://www.astrosetu.com/public/logo/astrosetu.jpeg" alt="AstroSetu" style="max-width: 100%; height: auto;" />
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p style="font-size: 18px;">Your OTP is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #007bff;">${otp}</div>
      <p style="color: #777;">This OTP is valid for 10 minutes.</p>
    </div>
  `;

  return transporter.sendMail({
    from: `"AstroSetu" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify Your Email - AstroSetu',
    html,
  });
};

module.exports = { sendEmailOTP };

const mongoose = require('mongoose');
const { getCurrentIST } = require('../utils/timeUtils'); 

const adminSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, required: true, unique: true },
    email: { type: String, trim: true, required: true, unique: true },
    name: { type: String, trim: true, default: '' },
    password: { type: String, required: true },
    otp: { type: String, default: null },
    otp_expiry: { type: Date, default: getCurrentIST }, // Set OTP expiry in IST
    profile_image: { type: String, default: null },
    success: { type: Boolean, default: true },
    created_at: {
      type: Date,
      default: getCurrentIST, // Use custom function for IST
    },
    updated_at: {
      type: Date,
      default: getCurrentIST, // Use custom function for IST
    },
  },
  {
    collection: 'admins',
  }
);

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
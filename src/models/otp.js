const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OTPSchema = new Schema({
  number: {
    type: Number,
    required: true,
    unique: true
  },
  otp: {
    type: String,
    required: true, // Ensure OTP is always provided
    match: /^[0-9]{4}$/, // Validate it’s exactly 6 digits
    default: "", // Default value
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // OTP expires after 5 minutes (600 seconds)
  },
});

OTPSchema.index({ number: 1 }); 

module.exports = mongoose.model('OTP', OTPSchema);
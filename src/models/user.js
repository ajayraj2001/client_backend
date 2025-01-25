'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils'); 

const UserSchema = new Schema({
  name: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  number: {
    type: Number,
    unique: true,
    required: true
  },
  is_profile_complete: {
    type: Boolean,
    default: false,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', ''],
    default: '',
  },
  busy: {
    type: Boolean,
    default: false,
  },
  call_type: {
    type: String,
    default: '',
  },
  wallet: {
    type: Number,
    default: 0,
  },
  profile_img: {
    type: String,
    default: '',
  },
  referral_code: {
    type: String,
    default: '',
  },
  refer_user_id: {
    type: String,
    default: '',
  },
  dob: {
    type: String, // Store as String
    default: '',  // Default to empty string
  },
  tob: {
    type: String,
    default: '',
  },
  pob: {
    type: String,
    default: '',
  },
  rashi: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  deviceToken: {
    type: String,
    default: '',
  },
  deviceId: {
    type: String,
    default: '',
  },
  otp: {
    type: Number,
    default: null,
  },
  otp: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        // Validate that OTP is a 6-digit number (if provided)
        return v === null || (v >= 100000 && v <= 999999);
      },
      message: 'OTP must be a 6-digit number',
    },
  },
  otpExpiresAt: {
    type: Date, // Field to store OTP expiration time
  },
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at', 
    currentTime: getCurrentIST, // Use IST for timestamps
  },
});

// Indexes for faster queries
UserSchema.index({ number: 1 }); // Index on `number` for fast lookups

module.exports = mongoose.model('User', UserSchema);
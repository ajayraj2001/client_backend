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
    type: String,
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
    type: String,
    required: false, // Ensure OTP is always provided
    match: /^[0-9]{4}$/, // Validate it’s exactly 6 digits
    default: "", // Default value
  },
  otpExpiresAt: {
    type: Date, // Field to store OTP expiration time
  },

  free_calls_used_today: { type: Number, default: 0 }, // Track free calls used today
  last_free_call_reset: { type: Date, default: Date.now }, // Track when the free call count was last reset

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
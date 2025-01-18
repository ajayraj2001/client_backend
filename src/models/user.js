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
    required: true,
    trim: true,
  },
  is_profile_complete: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Other',
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
    type: String,
    default: '',
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
    default: '',
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
UserSchema.index({ email: 1 });  // Index on `email` for fast lookups

module.exports = mongoose.model('User', UserSchema);
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

// Subdocument for account details
const accountDetailsSchema = new Schema({
  account_type: { type: String, default: '' },
  account_holder_name: { type: String, default: '' },
  account_no: { type: String, default: '' },
  bank: { type: String, default: '' },
  ifsc: { type: String, default: '' },
});

const astrologerSchema = new Schema({
  // Basic Information
  name: { type: String, required: 'Kindly enter the name' },
  number: { type: String, required: 'Kindly enter the number', unique: true },
  email: { type: String, required: 'Kindly enter the email', unique: true },
  password: { type: String, default: '' },
  about: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  dob: { type: Date, default: null },
  gender: { type: String, default: '' },
  address: { type: String, default: '' },
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }], // Multiple languages
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }], // Multiple skills
  state: { type: String, default: '' },
  city: { type: String, default: '' },

  // Account Details (Array for multiple accounts)
  account_details: accountDetailsSchema,

  // Wallet and Pricing
  wallet: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  display_per_min_chat: { type: Number, default: 0 },
  display_per_min_voice_call: { type: Number, default: 0 },
  display_per_min_video_call: { type: Number, default: 0 },
  per_min_chat: { type: Number, default: 0 },
  per_min_voice_call: { type: Number, default: 0 },
  per_min_video_call: { type: Number, default: 0 },

  // Services and Availability
  is_chat: { type: String, default: 'off' },
  is_voice_call: { type: String, default: 'off' },
  is_video_call: { type: String, default: 'off' },
  is_chat_online: { type: String, default: 'off' },
  is_voice_online: { type: String, default: 'off' },
  is_video_online: { type: String, default: 'off' },

  //totalminutes
  chat_mins: { type: Number, default: 0 },
  voice_mins: { type: Number, default: 0 },

  // Profile and Documents
  profile_img: { type: String, default: '' },
  aadhar_card_img: { type: String, default: '' },
  pan_card_img: { type: String, default: '' },

  status: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive', },
  password_created: { type: Boolean, default: false, },

  // Device Information
  deviceToken: { type: String, default: '' },
  deviceId: { type: String, default: '' },

  // Additional Information
  contact_no2: { type: String, default: '' },
  pincode: { type: String, default: '' },
  pan_card: { type: String, default: '' },
  aadhar_card_no: { type: String, default: '' },
  gst: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  call_type: { type: String, default: '' },

  //otp
  otp: { type: String, default: null },
  otp_expiry: { type: Date, default: null },

  // Ratings & Calls Count
  rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
  call_counts: { type: Number, default: 0 },

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST, // Use IST for timestamps
  }
});

astrologerSchema.index({ number: 1 });  // Index on `email` for fast lookups
astrologerSchema.index({ email: 1 });  // Index on `email` for fast lookups


module.exports = mongoose.model('Astrologer', astrologerSchema);
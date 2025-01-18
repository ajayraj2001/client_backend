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
  ifsc: { type: String, default: '' }
});

const astrologerSchema = new Schema({
  // Basic Information
  name: { type: String, required: 'Kindly enter the name' },
  number: { type: String, required: 'Kindly enter the number', unique: true },
  email: { type: String, required: 'Kindly enter the email', unique: true },
  password: { type: String, default: '' },
  about: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  address: { type: String, default: '' },
  language: { type: String, default: '' },
  state: { type: String, default: '' },
  city: { type: String, default: '' },

  // Account Details (Array for multiple accounts)
  account_details: [accountDetailsSchema],

  // Wallet and Pricing
  wallet: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
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

  // Profile and Documents
  profile_img: { type: String, default: '' },
  aadhar_card_img: { type: String, default: '' },
  pan_card_img: { type: String, default: '' },

  
  status: { type: String,  enum: ['Active', 'Inactive'],default: 'Inactive', },

  // Device Information
  deviceToken: { type: String, default: '' },
  deviceId: { type: String, default: '' },
  deviceType: { type: String, default: '' },

  // Additional Information
  contact_no2: { type: String, default: '' },
  pincode: { type: String, default: '' },
  pan_card: { type: String, default: '' },
  aadhar_card_no: { type: String, default: '' },
  gst: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  call_type: { type: String, default: '' }, 

  // Ratings and Orders
  rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
  order_count: { type: Number, default: 0 },
},{
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at', 
    currentTime: getCurrentIST, // Use IST for timestamps
  }
});

module.exports = mongoose.model('Astrologer', astrologerSchema);
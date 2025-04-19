'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const AddressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true  // Index for faster lookups
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true
  },
  alternateNumber: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  landmark: {
    type: String,
    default: '',
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  addressType: {
    type: String,
    enum: ['HOME', 'WORK', 'OTHER'],
    default: 'HOME'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at', 
    currentTime: getCurrentIST,
  }
});

// Create compound indexes for queries
AddressSchema.index({ userId: 1, isDefault: 1 });

// Pre-save middleware to ensure only one default address
// AddressSchema.pre('save', async function(next) {
//   console.log('yessdfsdfds9980980---')
//   // If this is being set as default address
//   if (this.isDefault) {
//     try {
//       // Find and unset any existing default address for this user
//       await this.constructor.updateMany(
//         { userId: this.userId, _id: { $ne: this._id }, isDefault: true },
//         { $set: { isDefault: false } }
//       );
//       next();
//     } catch (error) {
//       next(error);
//     }
//   } else {
//     next();
//   }
// });

module.exports = mongoose.model('Address', AddressSchema);
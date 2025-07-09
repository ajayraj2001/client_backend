const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const bannerSchema = new Schema({
  type: {
    type: String,
    enum: ['app', 'web'], // Only allow 'app' or 'web'
    default: 'app',
  },
  img: {
    type: String, // Image URL
    default: "",
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'], // Only allow 'Active' or 'Inactive'
    default: 'Inactive',
  },
  // New fields for redirect functionality
  redirectType: {
    type: String,
    enum: ['none', 'puja', 'product', 'external'], // Redirect types
    default: 'none',
  },

  redirectId: {
    type: String, // ID of specific puja or product (optional)
    default: null,
  },
  redirectUrl: {
    type: String, // External URL for external redirect type
    default: null,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST, // Use IST for timestamps
  },
});

module.exports = mongoose.model('Banner', bannerSchema);
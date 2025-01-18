const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils'); 

const bannerSchema = new Schema({
  link: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['app', 'web'], // Only allow 'app' or 'web'
    default: 'app',
  },
  img: {
    type: String, // Array of image URLs
    default: "",
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'], // Only allow 'Active' or 'Inactive'
    default: 'Inactive',
  },
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at', 
    currentTime: getCurrentIST, // Use IST for timestamps
  },
});

module.exports = mongoose.model('Banner', bannerSchema);
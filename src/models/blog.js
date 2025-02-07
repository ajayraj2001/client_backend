const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const blogSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
  },
  thumbnailImage: {
    type: String,
    default: '', // Default empty string
  },
  galleryImages: {
    type: [String], // Array of image paths
    default: [], // Default empty array
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Inactive',
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST, // Use IST for timestamps
  },
});

module.exports = mongoose.model('Blog', blogSchema);
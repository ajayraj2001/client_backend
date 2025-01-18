const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils'); 

const blogSchema = new Schema({
//   category_id: {
//     type: mongoose.Schema.Types.ObjectId, // Use ObjectId for referencing categories
//     ref: 'Category', // Reference to the Category model
//     required: true,
//   },
  title: {
    type: String,
    required: [true, 'Title is required'], // Validation message
    trim: true, // Remove extra spaces
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  author: { // Corrected spelling from "auther" to "author"
    type: String,
    required: [true, 'Author is required'],
    trim: true,
  },
  img: {
    type: String,
    default: '', // Default empty string
  },
  icon: {
    type: String,
    default: '', // Default empty string
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

module.exports = mongoose.model('Blog', blogSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const languageSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Language name is required'],
    unique: true,
    trim: true,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST, // Use IST for timestamps
  },
});

module.exports = mongoose.model('Language', languageSchema);
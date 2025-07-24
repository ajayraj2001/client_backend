'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const NotificationSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null means it's a general broadcast to all users
  },
  type: {
    type: String,
    enum: ['Puja', 'Panchang', 'General'],
    default: 'General'
  },
  type_ref_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  is_read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);

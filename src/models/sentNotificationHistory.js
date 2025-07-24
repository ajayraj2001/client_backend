const mongoose = require('mongoose');
const { getCurrentIST } = require('../utils/timeUtils');

const notificationHistorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  image: { type: String },
  type: { type: String, required: true },
  type_ref_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  created_at: {
    type: Date,
    default: getCurrentIST
  }
});

module.exports = mongoose.model('SentNotificationHistory', notificationHistorySchema);

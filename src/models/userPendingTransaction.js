const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils'); 

const pendingTransactionSchema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  razorpay_order_id: { type: String, required: true }, // Razorpay order ID
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  timestamp: { type: Date, default: getCurrentIST }
});

// Indexing for faster queries
pendingTransactionSchema.index({ user_id: 1, timestamp: -1 });
pendingTransactionSchema.index({ razorpay_order_id: 1 }); // For fast lookups during webhook handling

module.exports = mongoose.model('UserPendingTransaction', pendingTransactionSchema);
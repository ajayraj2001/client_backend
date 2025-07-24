const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userWalletHistorySchema = new Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // call_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CallChatHistory', required: true },
    call_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CallChatHistory', default: null }, // Always included, default null
    transaction_type: { type: String, enum: ['debit', 'credit'], required: true },
    amount: { type: Number, required: true },
    is_free_call: { type: Boolean, default: false },
    call_type: { type: String, enum: ['chat', 'voice', 'video', ''], default: '' },
    description: { type: String, required: true }, // e.g., "Recharge", "Chat with Astrologer John"
    
    razorpay_order_id: { type: String }, // Razorpay order ID
    razorpay_payment_id: { type: String }, // Razorpay payment ID (for successful transactions)
    razorpay_signature: { type: String }, // Razorpay webhook signature
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' }, // Transaction status

    timestamp: { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST
});

// Indexing for faster queries
userWalletHistorySchema.index({ user_id: 1, timestamp: -1 });

module.exports = mongoose.model('UserWallet', userWalletHistorySchema);
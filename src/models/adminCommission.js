const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminCommissionHistorySchema = new Schema({
    astrologer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
    call_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CallChatHistory', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    is_free_call: { type: Boolean, default: false },
    call_type: { type: String, enum: ['chat', 'voice', 'video'], required: true },
    amount: { type: Number, required: true }, // Admin's share
    timestamp: { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST
});

// Indexing for faster queries
adminCommissionHistorySchema.index({ astrologer_id: 1, user_id: 1, timestamp: -1 });

module.exports = mongoose.model('AdminCommission', adminCommissionHistorySchema);
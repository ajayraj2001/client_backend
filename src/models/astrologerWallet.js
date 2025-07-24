const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const astrologerWalletHistorySchema = new Schema({
    astrologer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
    call_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CallChatHistory', required: true },
    transaction_type: { type: String, enum: ['debit', 'credit'], required: true },
    is_free_call: { type: Boolean, default: false },
    amount: { type: Number, required: true },
    call_type: { type: String, enum: ['chat', 'voice', 'video', ''], default: '' }, // Added call_type
    description: { type: String, required: true }, // e.g., "Withdrawal", "Earnings from Chat"
    timestamp: { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST
});

// Indexing for faster queries
astrologerWalletHistorySchema.index({ astrologer_id: 1, timestamp: -1 });

module.exports = mongoose.model('AstrologerWallet', astrologerWalletHistorySchema);
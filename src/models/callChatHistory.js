const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const callChatHistorySchema = new Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    astrologer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
    call_type: { type: String, enum: ['chat', 'voice', 'video'], required: true },
    created_at: { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST (when call is initiated)
    start_time: { type: Date }, // IST (when astrologer accepts the call)
    end_time: { type: Date }, // IST (when call ends)
    duration: { type: Number }, // in seconds
    status: { type: String, enum: ['call_initiate', 'accept_astro', 'reject_astro', 'reject_user', 'end_user', 'end_astro', 'auto_cut', 'wallet_empty'], required: true },
    cost: { type: Number, default: 0 }, // total cost of the call/chat
});

// Indexing for faster queries
callChatHistorySchema.index({ user_id: 1, astrologer_id: 1, created_at: -1 });

module.exports = mongoose.model('CallChatHistory', callChatHistorySchema);
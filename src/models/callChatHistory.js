const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const callChatHistorySchema = new Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    astrologer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
    call_type: { type: String, enum: ['chat', 'voice', 'video'], required: true },
    // New fields for free calls
    is_free_call: { type: Boolean, default: false },

    created_at: { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST (when call is initiated)
    start_time: { type: Date , default: null }, // IST (when astrologer accepts the call)
    end_time: { type: Date , default: null }, // IST (when call ends)
    duration: { type: Number }, // in seconds
    status: { type: String, enum: ['call_initiate', 'accept_astro', 'reject_astro', 'reject_user', 'end_user', 'end_astro', 'auto_rejected', 'insufficient_balance', 'disconnected'], required: true },
    cost: { type: Number, default: 0 }, // total cost of the call/chat
    astro_cut: { type: Number, default: 0 }, // astro cut of the call/chat
    admin_cut: { type: Number, default: 0 }, // admin cut of the call/chat
});

// Indexing for faster queries
callChatHistorySchema.index({ user_id: 1, call_type: 1, created_at: -1 }); // For user-specific queries with call_type and latest at top
callChatHistorySchema.index({ astrologer_id: 1, call_type: 1, created_at: -1 }); // For astrologer-specific queries with call_type and latest at top
// callChatHistorySchema.index({ call_type: 1, created_at: -1 }); // For admin queries filtering by call_type with latest at top

module.exports = mongoose.model('CallChatHistory', callChatHistorySchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    astrologer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
    message: { type: String, required: true },
    sender: { type: String, enum: ['user', 'astrologer'], required: true }, // Who sent the message
    timestamp: { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST
    read: { type: Boolean, default: false },
    messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
});

// Indexing for faster retrieval of chat history
chatMessageSchema.index({ user_id: 1, astrologer_id: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const liveStreamSchema = new Schema({
  astrologer_id: { type: Schema.Types.ObjectId, ref: 'Astrologer', required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date, default: null },
  status: { type: String, enum: ['Live', 'Ended'], default: 'Live' },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users currently watching
  total_viewers: { type: Number, default: 0 }, // Total viewers over time
  gifts: [{
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gift_id: { type: Schema.Types.ObjectId, ref: 'Gift', required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('LiveStream', liveStreamSchema);
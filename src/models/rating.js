const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  astrologer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Astrologer',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

ratingSchema.index({ astrologer_id: 1, user_id: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
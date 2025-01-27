const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const giftSchema = new Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    amount: { type: Number, required: true }, // Monetary value of the gift
  }, {
    timestamps: true,
  });
  
  module.exports = mongoose.model('Gift', giftSchema);
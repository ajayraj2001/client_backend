'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');
const baseTransactionSchema = require('./baseTransactionSchema');

const ChadawaTransactionSchema = new Schema({
  ...baseTransactionSchema,

  // Chadawa specific fields
  chadawaId: {
    type: Schema.Types.ObjectId,
    ref: 'Chadawa',
    required: true,
    index: true // Index for faster lookups
  },
  chadawaDate: {
    type: Date,
    default: null
  },
  chadawaName: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  chadawaStatus: {
    type: String,
    enum: ['chadawa booked', 'chadawa completed'],
    default: "chadawa booked"
  },
  rating: {
    type: Number,
    default: 0
  },

  // Single offering (not array like in Puja)
  selectedOffering: {
    id: { type: mongoose.Schema.Types.ObjectId },
    header: String,
    price: Number,
    image: String
  },

  // Customer information
  customerDetails:
    {
      fullName: { type: String, default: "" },
      gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
      gotram: { type: String, default: "" }
    }

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST,
  },
});

// Create compound indexes for common query patterns
ChadawaTransactionSchema.index({ userId: 1, status: 1, created_at: -1 });
ChadawaTransactionSchema.index({ chadawaId: 1, status: 1 });

module.exports = mongoose.model('ChadawaTransaction', ChadawaTransactionSchema);
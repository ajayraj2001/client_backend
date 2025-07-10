'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');
const baseTransactionSchema = require('./baseTransactionSchema');

const PujaTransactionSchema = new Schema({
  ...baseTransactionSchema,

  // Puja specific fields
  pujaId: {
    type: Schema.Types.ObjectId,
    ref: 'Puja',
    required: true,
    index: true // Index for faster lookups
  },
  pujaDate: {
    type: Date,
    default: null
  },
  pujaTime: {
    type: String,
    default: ""
  },
  pujaName: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  pujaStatus: {
    type: String,
    enum: ['puja booked', 'puja completed'],
    default: "puja booked"
  },
  rating: {
    type: Number,
    default: 0
  },
  // selectedProducts: [
  //   {
  //     productId: {
  //       type: Schema.Types.ObjectId,
  //       ref: 'Product',
  //       required: true
  //     },
  //     name: {
  //       type: String,
  //       required: true
  //     },
  //     quantity: {
  //       type: Number,
  //       default: 1,
  //       min: 1
  //     },
  //     price: {
  //       type: Number,
  //       required: true
  //     },
  //     isCompulsory: {
  //       type: Boolean,
  //       default: false
  //     }
  //   }
  // ],

  // Customer information
  package: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    members: { type: Number, required: true }
  },
  selectedOfferings: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      header: String,
      price: Number,
      image: String
    }
  ],
  customerDetails: [
    {
      fullName: { type: String, default: "" },
      gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
      gotram: { type: String, default: "" }
    }
  ]

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST,
  },
});

// Create TTL index to automatically delete abandoned transactions after 24 hours
// Only applies to transactions where isPaymentAttempted is false
// PujaTransactionSchema.index(
//   { initiatedAt: 1 },
//   { expireAfterSeconds: 86400, partialFilterExpression: { isPaymentAttempted: false } }
// );

// Create compound indexes for common query patterns
PujaTransactionSchema.index({ userId: 1, status: 1, created_at: -1 });
PujaTransactionSchema.index({ pujaId: 1, status: 1 });

module.exports = mongoose.model('PujaTransaction', PujaTransactionSchema);
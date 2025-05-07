'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

// Base transaction schema with common fields for both puja and product transactions
const baseTransactionSchema = {
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for faster queries
  },
  totalAmount: {
    type: Number,
    required: true
  },
  orderAmount: {
    type: Number,
    required: true
  },
  gstAmount: {
    type: Number,
    required: true
  },
  receiptId: {
    type: String,
    default: ''
    // index: true // Index for faster order lookups
  },
  orderId: {
    type: String,
    required: true,
    // unique: true,
    // index: true // Index for faster order lookups
  },
  paymentId: {
    type: String,
    default: '',
    // index: true // Index for faster payment lookups
  },
  status: {
    type: String,
    enum: ['INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'],
    default: 'INITIATED',
    index: true // Index for status-based queries
  },
  // paymentMethod: {
  //   type: String,
  //   enum: ['RAZORPAY', 'WALLET', 'OTHER'],
  //   default: 'RAZORPAY'
  // },
  discountAmount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ''
  },
  initiatedAt: {
    type: Date,
    default: getCurrentIST
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Only save to transaction history if payment was at least initiated and not just viewed
  // This field will be updated to true once payment is attempted
  isPaymentAttempted: {
    type: Boolean,
    default: false,
    index: true // Important for filtering abandoned transactions
  }
};

module.exports = baseTransactionSchema;
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');
const baseTransactionSchema = require('./baseTransactionSchema');

const ProductTransactionSchema = new Schema({
  ...baseTransactionSchema,

  shippingCharges: {
    type: Number,
    default: 0
  },

  // Product specific fields
  products: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      rating: {
        type: Number,
        default: 0
      },
      unitPrice: {
        type: Number,
        required: true
      },
      displayedPrice: {
        type: Number,
        required: true
      },
      basePrice: {
        type: Number,
        required: true
      },
      gstAmount: {
        type: Number,
        required: true
      },
      totalPrice: {
        type: Number,
        required: true
      },

      estimatedDelivery: {
        type: Date,
        default: null
      },
      deliveryDate: {
        type: Date,
        default: null
      },
      // Delivery tracking
      deliveryStatus: {
        type: String,
        enum: ['Order placed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'],
        default: 'Order placed'
      },

    }
  ],

  // Shipping details
  shippingDetails: {
    name: {
      type: String,
      required: true
    },
    mobileNumber: {
      type: String,
      required: true
    },
    alternateNumber: {
      type: String,
      default: ''
    },
    address: {
      address: { type: String, required: true },
      landmark: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, default: 'India' },
      pincode: { type: String, required: true }
    }
  },
  // trackingId: {
  //   type: String,
  //   default: ''  
  // },

  // courierName: {
  //   type: String,
  //   default: ''
  // },

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    currentTime: getCurrentIST,
  },
});

// Create TTL index to automatically delete abandoned transactions after 24 hours
// Only applies to transactions where isPaymentAttempted is false
// ProductTransactionSchema.index(
//   { initiatedAt: 1 },
//   { expireAfterSeconds: 86400, partialFilterExpression: { isPaymentAttempted: false } }
// );

// Create compound indexes for common query patterns
ProductTransactionSchema.index({ userId: 1, status: 1, created_at: -1 });
ProductTransactionSchema.index({ 'products.productId': 1, status: 1 });
ProductTransactionSchema.index({ deliveryStatus: 1, created_at: -1 });

module.exports = mongoose.model('ProductTransaction', ProductTransactionSchema);
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const CartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,  // One cart per user
    index: true    // Index for faster lookups
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    addedAt: {
      type: Date,
      default: getCurrentIST
    }
  }],
  lastUpdated: {
    type: Date,
    default: getCurrentIST
  },
  // For cart summary (updated whenever cart changes)
  summary: {
    totalItems: {
      type: Number,
      default: 0
    },
    subtotal: {
      type: Number,
      default: 0
    },
    gstAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    savedAmount: {
      type: Number,
      default: 0  // Difference between displayed and actual prices
    }
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at', 
    currentTime: getCurrentIST,
  }
});

// Pre-save middleware to update summary
// CartSchema.pre('save', async function(next) {
//   if (!this.isModified('items')) return next();
  
//   try {
//     // Get all product IDs from items
//     const productIds = this.items.map(item => item.productId);
    
//     // Fetch all products in one query
//     const products = await mongoose.model('Product').find({
//       _id: { $in: productIds },
//       status: 'Active'
//     });
    
//     // Create a map for quick lookups
//     const productMap = products.reduce((map, product) => {
//       map[product._id.toString()] = product;
//       return map;
//     }, {});
    
//     // Calculate summary
//     let totalItems = 0;
//     let subtotal = 0;
//     let gstAmount = 0;
//     let savedAmount = 0;
    
//     for (const item of this.items) {
//       const product = productMap[item.productId.toString()];
      
//       // Skip if product not found or inactive
//       if (!product) continue;
      
//       totalItems += item.quantity;
      
//       // Calculate product amount (without GST)
//       const itemSubtotal = product.actualPrice * item.quantity;
//       subtotal += itemSubtotal;
      
//       // Calculate GST (18%)
//       const itemGst = itemSubtotal * 0.18;
//       gstAmount += itemGst;
      
//       // Calculate saved amount (displayed - actual)
//       const itemSaved = (product.displayedPrice - product.actualPrice) * item.quantity;
//       savedAmount += itemSaved > 0 ? itemSaved : 0;
//     }
    
//     // Update summary
//     this.summary = {
//       totalItems,
//       subtotal,
//       gstAmount,
//       totalAmount: subtotal + gstAmount,
//       savedAmount
//     };
    
//     // Update lastUpdated
//     this.lastUpdated = getCurrentIST();
    
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model('Cart', CartSchema);
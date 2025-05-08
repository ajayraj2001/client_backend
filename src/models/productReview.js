// models/ProductReview.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const productReviewSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    transactionId: {
        type: Schema.Types.ObjectId,
        ref: 'ProductTransaction',
        required: true,
        index: true
    },
    // Store the specific product entry from the transaction
    productTransactionItemId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        index: true
    },
    review: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Active', 'Hidden', 'Reported'],
        default: 'Active',
        index: true
    },
    helpfulVotes: {
        type: Number,
        default: 0
    },
    unhelpfulVotes: {
        type: Number,
        default: 0
    },
    verifiedPurchase: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST,
    }
});

// Create compound indexes for common query patterns
// productReviewSchema.index({ productId: 1, status: 1, created_at: -1 });
// productReviewSchema.index({ userId: 1, created_at: -1 });
// productReviewSchema.index({ productId: 1, rating: -1, helpfulVotes: -1 });
// productReviewSchema.index({ verifiedPurchase: 1, productId: 1, created_at: -1 });

module.exports = mongoose.model('ProductReview', productReviewSchema);
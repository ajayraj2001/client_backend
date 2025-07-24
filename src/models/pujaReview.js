// models/PujaReview.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const pujaReviewSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    pujaId: {
        type: Schema.Types.ObjectId,
        ref: 'Puja',
        required: true,
        index: true
    },
    transactionId: {
        type: Schema.Types.ObjectId,
        ref: 'PujaTransaction',
        required: true,
        index: true
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
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST,
    }
});

// Create compound indexes for common query patterns
// pujaReviewSchema.index({ pujaId: 1, status: 1, created_at: -1 });
// pujaReviewSchema.index({ userId: 1, created_at: -1 });

module.exports = mongoose.model('PujaReview', pujaReviewSchema);
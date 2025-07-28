const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const chadawaReviewSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    chadawaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chadawa',
        required: true,
    },
    transactionId: {
        type: Schema.Types.ObjectId,
        ref: 'ChadawaTransaction',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    review: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Pending',
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST, // Use IST for timestamps
    },
});

// Index for better query performance
chadawaReviewSchema.index({ chadawaId: 1, status: 1 });
chadawaReviewSchema.index({ userId: 1, chadawaId: 1 });

module.exports = mongoose.model('ChadawaReview', chadawaReviewSchema);
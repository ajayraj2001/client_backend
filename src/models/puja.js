const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const pujaSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Puja title is required'],
        trim: true,
    },
    pujaImage: {
        type: String,
        default: '',
    },
    slug: {
        type: String,
        default: '',
    },
    displayedPrice: {
        type: Number,
        required: [true, 'Displayed price is required'],
    },
    actualPrice: {
        type: Number,
        required: [true, 'Actual price is required'],
    },
    rating: {
        type: Number,
        default: 0
    },
    bannerImages: {
        type: [String],
        default: [],
    },
    pujaDate: {
        type: Date,
        default: null,
    },
    aboutPuja: {
        type: String,
        default: '',
    },
    shortDescription: {
        type: String,
        default: '',
    },
    benifits: {
        type: [String],
        default: [],
    },
    faq: [
        {
            question: { type: String, required: true },
            answer: { type: String, required: true },
        },
    ],
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Inactive',
      },
    isRecurring: {
        type: Boolean,
        default: false,
    },
    compulsoryProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
    optionalProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at', 
        currentTime: getCurrentIST, // Use IST for timestamps
      },
});

module.exports = mongoose.model('Puja', pujaSchema);
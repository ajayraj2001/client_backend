const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const chadawaSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Chadawa title is required'],
        trim: true,
    },
    titleHindi: {
        type: String,
        default: '',
    },
    chadawaImage: {
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
        default: 0,
    },
    bannerImages: {
        type: [String],
        default: [],
    },
    chadawaDate: {
        type: Date,
        default: null,
    },
    location: {
        type: String,
        default: '',
    },
    locationHindi: {
        type: String,
        default: '',
    },
    aboutChadawa: {
        type: String,
        default: '',
    },
    aboutChadawaHindi: {
        type: String,
        default: '',
    },
    shortDescription: {
        type: String,
        default: '',
    },
    shortDescriptionHindi: {
        type: String,
        default: '',
    },
    benefits: [
        {
            header: { type: String, required: true },
            headerHindi: { type: String, default: '' },
            description: { type: String, required: true },
            descriptionHindi: { type: String, default: '' },
        },
    ],
    faq: [
        {
            question: { type: String, required: true },
            questionHindi: { type: String, default: '' },
            answer: { type: String, required: true },
            answerHindi: { type: String, default: '' },
        },
    ],
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Inactive',
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    // Single offering object instead of array
    offering: {
        header: { type: String, required: true },
        headerHindi: { type: String, default: '' },
        description: { type: String, required: true },
        descriptionHindi: { type: String, default: '' },
        price: { type: String, default: '0' },
        image: { type: String, default: '' } // image path for the offering
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST, // Use IST for timestamps
    },
});

module.exports = mongoose.model('Chadawa', chadawaSchema);
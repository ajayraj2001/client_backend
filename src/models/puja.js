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
        default: ""
    },
    bannerImages: {
        type: [String],
        default: [],
    },
    pujaDate: {
        type: Date, // Changed to Date format
        default: null, // Null for recurring pujas
    },
    aboutPuja: {
        type: String,
        default: '',
    },
    benifits: {
        type: [String],
        default: [],
    },
    packages: [
        {
            packageName: { type: String, required: true },
            packageType: {
                type: String,
                enum: ['Individual', 'Group', 'Family', 'Others'],
                default: 'Individual',
            },
            packagePrice: { type: Number, required: true },
            packageDescription: { type: [String], required: true },
        },
    ],
    faq: [
        {
            question: { type: String, required: true },
            answer: { type: String, required: true },
        },
    ],
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },
    isRecurring: {
        type: Boolean,
        default: false, // True for pujas that show every time
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST, // Use IST for timestamps
    },
});

module.exports = mongoose.model('Puja', pujaSchema);
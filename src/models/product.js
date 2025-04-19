const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const productSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category ID is required'],
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
    img: {
        type: [String], // Array of image paths
        default: [], // Default empty array
    },
    details: {
        type: [{ key: String, value: String }], // Array of key-value pairs
        default: [],
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Inactive',
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST, // Use IST for timestamps
    },
});

module.exports = mongoose.model('Product', productSchema);
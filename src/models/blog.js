const mongoose = require('mongoose');
const { getCurrentIST } = require('../utils/timeUtils');


const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Blog title is required'],
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
    },
    excerpt: {
        type: String,
        default: '',
        trim: true,
    },
    author: {
        type: String,
        default: '',
        trim: true,
    },
    html: {
        type: String,
        required: [true, 'Blog content is required'],
    },
    featuredImage: {
        type: String,
        default: '',
    },
    tags: {
        type: [String],
        default: [],
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Draft'],
        default: 'Active',
    },
}, {
    timestamps: {
        currentTime: getCurrentIST, // Use Indian Standard Time
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
});

// Add indexes for better query performance
blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ author: 1 });
blogSchema.index({ slug: 1 }); // Index for slug queries

module.exports = mongoose.model('Blog', blogSchema);
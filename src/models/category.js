const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true,
    },
    image: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Inactive',
      }
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at', 
        currentTime: getCurrentIST, // Use IST for timestamps
      },
});

module.exports = mongoose.model('Category', categorySchema);
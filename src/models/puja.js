// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;
// const { getCurrentIST } = require('../utils/timeUtils');

// const pujaSchema = new Schema({
//     title: {
//         type: String,
//         required: [true, 'Puja title is required'],
//         trim: true,
//     },
//     pujaImage: {
//         type: String,
//         default: '',
//     },
//     slug: {
//         type: String,
//         default: '',
//     },
//     displayedPrice: {
//         type: Number,
//         required: [true, 'Displayed price is required'],
//     },
//     actualPrice: {
//         type: Number,
//         required: [true, 'Actual price is required'],
//     },
//     rating: {
//         type: Number,
//         default: 0
//     },
//     bannerImages: {
//         type: [String],
//         default: [],
//     },
//     pujaDate: {
//         type: Date,
//         default: null,
//     },
//     aboutPuja: {
//         type: String,
//         default: '',
//     },
//     shortDescription: {
//         type: String,
//         default: '',
//     },
//     benifits: {
//         type: [String],
//         default: [],
//     },
//     faq: [
//         {
//             question: { type: String, required: true },
//             answer: { type: String, required: true },
//         },
//     ],
//     status: {
//         type: String,
//         enum: ['Active', 'Inactive'],
//         default: 'Inactive',
//       },
//     isRecurring: {
//         type: Boolean,
//         default: false,
//     },
//     compulsoryProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
//     optionalProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
// }, {
//     timestamps: { 
//         createdAt: 'created_at', 
//         updatedAt: 'updated_at', 
//         currentTime: getCurrentIST, // Use IST for timestamps
//       },
// });

// module.exports = mongoose.model('Puja', pujaSchema);


const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils');

const pujaSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Puja title is required'],
        trim: true,
    },
    titleHindi: {
        type: String,
        default: '',
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
        default: 0,
    },
    bannerImages: {
        type: [String],
        default: [],
    },
    pujaDate: {
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
    aboutPuja: {
        type: String,
        default: '',
    },
    aboutPujaHindi: {
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
    pujaProcess: [
        {
            stepNumber: { type: Number, required: true },
            title: { type: String, required: true },
            titleHindi: { type: String, default: '' },
            description: { type: String, required: true },
            descriptionHindi: { type: String, default: '' },
        },
    ],
    packages: [
        {
            type: {
                type: String,
                enum: ['Individual', 'Family', 'Joint Family'],
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
            members: {
                type: Number,
                required: true,
            }
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
    offerings: [
        {
            header: { type: String, required: true },
            headerHindi: { type: String, default: '' },
            description: { type: String, required: true },
            descriptionHindi: { type: String, default: '' },
            image: { type: String, default: '' } // image path for the offering
        }
    ],
    // isRecurring: {
    //     type: Boolean,
    //     default: false,
    // },
    //   compulsoryProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    //   optionalProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: getCurrentIST, // Use IST for timestamps
    },
});

module.exports = mongoose.model('Puja', pujaSchema);

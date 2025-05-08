// controllers/pujaReviewController.js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { PujaReview, Puja, PujaTransaction, ProductReview, Product, ProductTransaction } = require('../../models');

// Helper function to update average rating for a puja
const updatePujaAverageRating = async (pujaId) => {
    try {
        // Calculate average rating
        const result = await PujaReview.aggregate([
            {
                $match: {
                    pujaId: new ObjectId(pujaId),
                    status: 'Active'
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const averageRating = result.length > 0 ? result[0].averageRating : 0;
        const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place

        // Update the puja with new average rating
        await Puja.findByIdAndUpdate(pujaId, { rating: roundedRating });

        return roundedRating;
    } catch (error) {
        console.error('Error updating puja average rating:', error);
        throw error;
    }
};

// Submit a new puja review
exports.submitPujaReview = async (req, res) => {
    try {
        const { pujaId, transactionId, rating, review } = req.body;
        const userId = req.user._id; // Assuming you have user authentication middleware

        // Validate required fields
        if (!pujaId || !transactionId || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate rating value
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Verify the transaction exists, belongs to the user, and is completed
        // const transaction = await PujaTransaction.findOne({
        //     _id: transactionId,
        //     userId: userId,
        //     pujaId: pujaId,
        //     status: 'COMPLETED'
        // });
        const transaction = await PujaTransaction.findById(transactionId);

        if (!transaction) {
            // if (!transaction || transaction.status != "COMPLETED") {
            return res.status(404).json({
                success: false,
                message: 'Puja transaction not found, not completed, or does not match the provided puja'
            });
        }

        // Check if user has already reviewed this puja from this transaction
        const existingReview = await PujaReview.findOne({
            userId,
            // pujaId,
            transactionId
        });

        if (existingReview) {
            // Update existing review
            existingReview.rating = rating;
            existingReview.review = review || existingReview.review;
            existingReview.status = 'Active';
            await existingReview.save();

            // Update the transaction rating as well
            transaction.rating = rating;
            await transaction.save();

            // Update average rating for the puja
            await updatePujaAverageRating(pujaId);

            return res.status(200).json({
                success: true,
                message: 'Puja review updated successfully',
                data: existingReview
            });
        } else {
            // Create new review
            const newReview = await PujaReview.create({
                userId,
                pujaId,
                transactionId,
                rating,
                review: review || ''
            });

            // Update the transaction rating
            transaction.rating = rating;
            await transaction.save();

            // Update average rating for the puja
            await updatePujaAverageRating(pujaId);

            return res.status(201).json({
                success: true,
                message: 'Puja review submitted successfully',
                data: newReview
            });
        }
    } catch (error) {
        console.error('Error submitting puja review:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while submitting puja review',
            error: error.message
        });
    }
};

// Get user's puja reviews
exports.getUserPujaReviewByTransaction = async (req, res) => {
    try {
        const userId = req.user._id;
        const transactionId = req.query.transactionId;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }

        // Find the review by userId and transactionId
        const review = await PujaReview.findOne({ userId, transactionId })
            .populate('pujaId', 'title pujaImage rating')
            .lean();

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found for this transaction'
            });
        }

        return res.status(200).json({
            success: true,
            data: review
        });

    } catch (error) {
        console.error('Error fetching puja review by transaction ID:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the review',
            error: error.message
        });
    }
};

// Get reviews for a specific puja
exports.getPujaReviews = async (req, res) => {
    try {
        const { pujaId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total count
        const totalCount = await PujaReview.countDocuments({
            pujaId,
            status: 'Active'
        });

        // Get reviews with user information
        const reviews = await PujaReview.find({
            pujaId,
            status: 'Active'
        })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name profile_img') // Adjust fields as per your User model
            .lean();

        // Get rating statistics
        const stats = await PujaReview.aggregate([
            {
                $match: {
                    pujaId: new ObjectId(pujaId),
                    status: 'Active'
                }
            },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    rating: '$_id',
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { rating: -1 } }
        ]);

        // Get average rating
        const avgResult = await PujaReview.aggregate([
            {
                $match: {
                    pujaId: new ObjectId(pujaId),
                    status: 'Active'
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        const averageRating = avgResult.length > 0 ?
            {
                average: Math.round(avgResult[0].averageRating * 10) / 10,
                total: avgResult[0].totalRatings
            } :
            { average: 0, total: 0 };

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                stats,
                averageRating,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching puja reviews:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching puja reviews',
            error: error.message
        });
    }
};

// Admin-only: Update puja review status
exports.updatePujaReviewStatus = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Admin only'
            });
        }

        const { reviewId } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['Active', 'Hidden', 'Reported'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Update review status
        const review = await PujaReview.findByIdAndUpdate(
            reviewId,
            { status },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Update average rating for the puja
        await updatePujaAverageRating(review.pujaId);

        return res.status(200).json({
            success: true,
            message: 'Puja review status updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Error updating puja review status:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating puja review status',
            error: error.message
        });
    }
};

//for products
// Helper function to update average rating for a product
const updateProductAverageRating = async (productId) => {
    try {
        // Calculate average rating
        const result = await ProductReview.aggregate([
            {
                $match: {
                    productId: new ObjectId(productId),
                    status: 'Active'
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const averageRating = result.length > 0 ? result[0].averageRating : 0;
        const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place

        // Update the product with new average rating
        await Product.findByIdAndUpdate(productId, { rating: roundedRating });

        return roundedRating;
    } catch (error) {
        console.error('Error updating product average rating:', error);
        throw error;
    }
};

// Submit a new product review
exports.submitProductReview = async (req, res) => {
    try {
        const { productId, transactionId, rating, review } = req.body;
        const userId = req.user._id; // Assuming you have user authentication middleware

        // Validate required fields
        if (!productId || !transactionId || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate rating value
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Verify the transaction exists, belongs to the user, and is completed
        // const transaction = await ProductTransaction.findOne({
        //     _id: transactionId,
        //     userId: userId,
        //     status: 'COMPLETED',
        //     'products.productId': productId
        // });
        const transaction = await ProductTransaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Product transaction not found, not completed, or does not include the product'
            });
        }

        // Find the specific product in the transaction
        const productItem = transaction.products.find(
            p => p.productId.toString() === productId
        );

        if (!productItem) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in the transaction'
            });
        }

        // Check if user has already reviewed this product from this transaction
        const existingReview = await ProductReview.findOne({
            userId,
            // productId,
            transactionId,
            // productTransactionItemId: productItem._id
        });

        if (existingReview) {
            // Update existing review
            existingReview.rating = rating;
            existingReview.review = review || existingReview.review;
            existingReview.status = 'Active';
            await existingReview.save();

            // Update the product item rating in the transaction
            productItem.rating = rating;
            await transaction.save();

            // Update average rating for the product
            await updateProductAverageRating(productId);

            return res.status(200).json({
                success: true,
                message: 'Product review updated successfully',
                data: existingReview
            });
        } else {
            // Create new review
            const newReview = await ProductReview.create({
                userId,
                productId,
                transactionId,
                productTransactionItemId: productItem._id,
                rating,
                review: review || '',
                verifiedPurchase: true
            });

            // Update the product item rating in the transaction
            productItem.rating = rating;
            await transaction.save();

            // Update average rating for the product
            await updateProductAverageRating(productId);

            return res.status(201).json({
                success: true,
                message: 'Product review submitted successfully',
                data: newReview
            });
        }
    } catch (error) {
        console.error('Error submitting product review:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while submitting product review',
            error: error.message
        });
    }
};

// Get reviews for a specific product
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'recent'; // Options: recent, helpful, highRated, lowRated

        // Build sort options based on sortBy parameter
        let sortOptions = {};
        if (sortBy === 'recent') {
            sortOptions = { created_at: -1 };
        } else if (sortBy === 'helpful') {
            sortOptions = { helpfulVotes: -1, created_at: -1 };
        } else if (sortBy === 'highRated') {
            sortOptions = { rating: -1, created_at: -1 };
        } else if (sortBy === 'lowRated') {
            sortOptions = { rating: 1, created_at: -1 };
        }

        // Filter options
        const filterOptions = {
            productId,
            status: 'Active'
        };

        // If verifiedPurchase filter is provided
        if (req.query.verifiedPurchase === 'true') {
            filterOptions.verifiedPurchase = true;
        }

        // If rating filter is provided
        if (req.query.ratingFilter) {
            filterOptions.rating = parseInt(req.query.ratingFilter);
        }

        // Get total count
        const totalCount = await ProductReview.countDocuments(filterOptions);

        // Get reviews with user information
        const reviews = await ProductReview.find(filterOptions)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name profilePicture')
            .lean();

        // Get rating statistics
        const stats = await ProductReview.aggregate([
            {
                $match: {
                    productId: new ObjectId(productId),
                    status: 'Active'
                }
            },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    rating: '$_id',
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { rating: -1 } }
        ]);

        // Get average rating
        const avgResult = await ProductReview.aggregate([
            {
                $match: {
                    productId: new ObjectId(productId),
                    status: 'Active'
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                    verifiedPurchases: {
                        $sum: { $cond: [{ $eq: ['$verifiedPurchase', true] }, 1, 0] }
                    }
                }
            }
        ]);

        const averageRating = avgResult.length > 0 ?
            {
                average: Math.round(avgResult[0].averageRating * 10) / 10,
                total: avgResult[0].totalRatings,
                verifiedPurchases: avgResult[0].verifiedPurchases
            } :
            { average: 0, total: 0, verifiedPurchases: 0 };

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                stats,
                averageRating,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching product reviews:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching product reviews',
            error: error.message
        });
    }
};

exports.getUserProductReviewByTransaction = async (req, res) => {
    try {
        const userId = req.user._id;
        const transactionId = req.query.transactionId;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }

        // Find the review by userId and transactionId
        const review = await ProductReview.findOne({ userId, transactionId })
            .populate('productId', 'name img rating')
            .lean();

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found for this transaction'
            });
        }

        return res.status(200).json({
            success: true,
            data: review
        });

    } catch (error) {
        console.error('Error fetching product review by transaction ID:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the product review',
            error: error.message
        });
    }
};


// Get user's product reviews
exports.getUserProductReviews = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total count
        const totalCount = await ProductReview.countDocuments({ userId });

        // Get user's reviews
        const reviews = await ProductReview.find({ userId })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate('productId', 'name img rating')
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    pages: Math.ceil(totalCount / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user product reviews:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching user product reviews',
            error: error.message
        });
    }
};

// Delete a product review
exports.deleteProductReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        // Find the review
        const review = await ProductReview.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if the review belongs to the user
        if (review.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this review'
            });
        }

        // Delete the review
        await ProductReview.findByIdAndDelete(reviewId);

        // Update average rating for the product
        await updateProductAverageRating(review.productId);

        return res.status(200).json({
            success: true,
            message: 'Product review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product review:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting product review',
            error: error.message
        });
    }
};

// Vote on a review (helpful/unhelpful)
exports.voteProductReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { voteType } = req.body; // 'helpful' or 'unhelpful'

        // Validate vote type
        if (!['helpful', 'unhelpful'].includes(voteType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vote type. Must be "helpful" or "unhelpful"'
            });
        }

        // Find the review
        const review = await ProductReview.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Update vote count
        if (voteType === 'helpful') {
            review.helpfulVotes += 1;
        } else {
            review.unhelpfulVotes += 1;
        }

        await review.save();

        return res.status(200).json({
            success: true,
            message: `Vote recorded as ${voteType}`,
            data: {
                helpfulVotes: review.helpfulVotes,
                unhelpfulVotes: review.unhelpfulVotes
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting product review',
            error: error.message
        });
    }
};


// controllers/productReviewController.js (continued)
// Check if user can review a product
exports.canUserReviewProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        // Check if the user has completed a transaction containing this product
        const productTransaction = await ProductTransaction.findOne({
            userId,
            'products.productId': productId,
            status: 'COMPLETED'
        });

        if (!productTransaction) {
            return res.status(200).json({
                success: true,
                data: {
                    canReview: false,
                    hasReviewed: false
                }
            });
        }

        // Find the product in the transaction
        const productItem = productTransaction.products.find(
            p => p.productId.toString() === productId
        );

        // Check if user has already reviewed this product
        const existingReview = await ProductReview.findOne({
            userId,
            productId,
            transactionId: productTransaction._id,
            productTransactionItemId: productItem._id
        });

        return res.status(200).json({
            success: true,
            data: {
                canReview: true,
                hasReviewed: !!existingReview,
                existingReview,
                transactionId: productTransaction._id,
                productTransactionItemId: productItem._id
            }
        });
    } catch (error) {
        console.error('Error checking if user can review product:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while checking review eligibility',
            error: error.message
        });
    }
};

// Admin-only: Update product review status
exports.updateProductReviewStatus = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Admin only'
            });
        }

        const { reviewId } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['Active', 'Hidden', 'Reported'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Update review status
        const review = await ProductReview.findByIdAndUpdate(
            reviewId,
            { status },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Update average rating for the product
        await updateProductAverageRating(review.productId);

        return res.status(200).json({
            success: true,
            message: 'Product review status updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Error updating product review status:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating product review status',
            error: error.message
        });
    }
};
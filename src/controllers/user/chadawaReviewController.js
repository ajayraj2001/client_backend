// controllers/chadawaReviewController.js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { ChadawaReview, Chadawa, ChadawaTransaction } = require('../../models');

// Helper function to update average rating for a chadawa
const updateChadawaAverageRating = async (chadawaId) => {
    try {
        // Calculate average rating
        const result = await ChadawaReview.aggregate([
            {
                $match: {
                    chadawaId: new ObjectId(chadawaId),
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

        // Update the chadawa with new average rating
        await Chadawa.findByIdAndUpdate(chadawaId, { rating: roundedRating });

        return roundedRating;
    } catch (error) {
        console.error('Error updating chadawa average rating:', error);
        throw error;
    }
};

// Submit a new chadawa review
exports.submitChadawaReview = async (req, res) => {
    try {
        const { chadawaId, transactionId, rating, review } = req.body;
        const userId = req.user._id; // Assuming you have user authentication middleware

        // Validate required fields
        if (!chadawaId || !transactionId || !rating) {
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

        // Verify the transaction exists
        const transaction = await ChadawaTransaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Chadawa transaction not found, not completed, or does not match the provided chadawa'
            });
        }

        // Check if user has already reviewed this chadawa from this transaction
        const existingReview = await ChadawaReview.findOne({
            userId,
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

            // Update average rating for the chadawa
            await updateChadawaAverageRating(chadawaId);

            return res.status(200).json({
                success: true,
                message: 'Chadawa review updated successfully',
                data: existingReview
            });
        } else {
            // Create new review
            const newReview = await ChadawaReview.create({
                userId,
                chadawaId,
                transactionId,
                rating,
                review: review || ''
            });

            // Update the transaction rating
            transaction.rating = rating;
            await transaction.save();

            // Update average rating for the chadawa
            await updateChadawaAverageRating(chadawaId);

            return res.status(201).json({
                success: true,
                message: 'Chadawa review submitted successfully',
                data: newReview
            });
        }
    } catch (error) {
        console.error('Error submitting chadawa review:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while submitting chadawa review',
            error: error.message
        });
    }
};

// Get user's chadawa reviews
exports.getUserChadawaReviewByTransaction = async (req, res) => {
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
        const review = await ChadawaReview.findOne({ userId, transactionId })
            .populate('chadawaId', 'title chadawaImage rating')
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
        console.error('Error fetching chadawa review by transaction ID:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the review',
            error: error.message
        });
    }
};

// Get reviews for a specific chadawa
exports.getChadawaReviews = async (req, res) => {
    try {
        const { chadawaId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total count
        const totalCount = await ChadawaReview.countDocuments({
            chadawaId,
            status: 'Active'
        });

        // Get reviews with user information
        const reviews = await ChadawaReview.find({
            chadawaId,
            status: 'Active'
        })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name profile_img') // Adjust fields as per your User model
            .lean();

        // Get rating statistics
        const stats = await ChadawaReview.aggregate([
            {
                $match: {
                    chadawaId: new ObjectId(chadawaId),
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
        const avgResult = await ChadawaReview.aggregate([
            {
                $match: {
                    chadawaId: new ObjectId(chadawaId),
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
        console.error('Error fetching chadawa reviews:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching chadawa reviews',
            error: error.message
        });
    }
};

// Admin-only: Update chadawa review status
exports.updateChadawaReviewStatus = async (req, res) => {
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
        const review = await ChadawaReview.findByIdAndUpdate(
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

        // Update average rating for the chadawa
        await updateChadawaAverageRating(review.chadawaId);

        return res.status(200).json({
            success: true,
            message: 'Chadawa review status updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Error updating chadawa review status:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating chadawa review status',
            error: error.message
        });
    }
};
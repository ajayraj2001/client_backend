const { ApiError } = require('../../errorHandler');
const { Astrologer, Rating } = require('../../models');

const getActiveAstrologers = async (req, res, next) => {
    try {
        const { serviceType,search  } = req.query; // 'chat', 'voice', 'video', or undefined for all

        let query = { status: 'Active' };
        let sortCriteria = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Adjust query based on service type
        if (serviceType === 'chat') {
            query.is_chat = 'on';
            sortCriteria.is_chat_online = -1; // Online first
        } else if (serviceType === 'voice') {
            query.is_voice_call = 'on';
            sortCriteria.is_voice_online = -1; // Online first
        } else if (serviceType === 'video') {
            query.is_video_call = 'on';
            sortCriteria.is_video_online = -1; // Online first
        }

        // Custom sorting: Online and not busy first, online but busy next, offline last
        sortCriteria = {
            ...sortCriteria,
            busy: 1, // Not busy first
            rating: -1, // Higher-rated first
        };

        const activeAstrologers = await Astrologer.find(query)
            .select('_id number experience name skills languages profile_img busy rating is_chat is_voice_call is_chat_online is_voice_online per_min_chat per_min_voice_call per_min_video_call display_per_min_chat display_per_min_voice_call') // Include only required fields
            .populate('languages', 'name')
            .populate('skills', 'name')
            .sort(sortCriteria); // Apply sorting


        return res.status(200).json({
            success: true,
            message: 'Active astrologers fetched successfully',
            data: activeAstrologers,
        });
    } catch (error) {
        next(error);
    }
};

const getAstroById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch the astrologer's profile
        const astrologer = await Astrologer.findById(id).select('-password -aadhar_card_img -pan_card_img')
            .populate('languages', 'name')
            .populate('skills', 'name');

        if (!astrologer) {
            throw new ApiError('Astrologer not found', 404);
        }

        // Fetch the latest 5 reviews for the astrologer
        const latestReviews = await Rating.find({ astrologer_id: id })
            .sort({ _id: -1 }) // Sort by _id in descending order (latest first)
            .limit(5) // Limit to 5 reviews
            .populate('user_id', 'name email profile_img'); // Include user details

        return res.status(200).json({
            success: true,
            message: 'Astrologer profile fetched successfully',
            data: {
                astrologer,
                latestReviews,
            },
        });
    } catch (error) {
        next(error);
    }
};

const addRatingAndReview = async (req, res, next) => {
    try {
        const { astrologer_id, rating, review } = req.body;
        const user_id = req.user._id; // User ID from middleware

        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new ApiError('Rating must be between 1 and 5', 400);
        }

        // Save the rating and review
        const newRating = new Rating({
            user_id,
            astrologer_id,
            rating,
            review,
        });
        await newRating.save();

        // Update the astrologer's average rating and total reviews
        const astrologer = await Astrologer.findById(astrologer_id);
        if (!astrologer) {
            throw new ApiError('Astrologer not found', 404);
        }

        // Calculate new average rating
        const totalRating = astrologer.rating * astrologer.total_reviews + rating;
        const totalReviews = astrologer.total_reviews + 1;
        let newAverageRating = totalRating / totalReviews;

        // Round to one decimal place (e.g., 4.45 -> 4.4, 4.49 -> 4.4)
        newAverageRating = Math.floor(newAverageRating * 10) / 10;

        // Update the astrologer
        astrologer.rating = newAverageRating;
        astrologer.total_reviews = totalReviews;
        await astrologer.save();

        return res.status(201).json({
            success: true,
            message: 'Rating and review added successfully',
            data: newRating,
        });
    } catch (error) {
        next(error);
    }
};


const getAstrologerReviews = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 10; // 10 reviews per page

        // Fetch paginated reviews for the astrologer
        const reviews = await Rating.find({ astrologer_id: id })
            .sort({ _id: -1 }) // Sort by _id in descending order (latest first)
            .skip((page - 1) * limit) // Skip reviews for previous pages
            .limit(limit) // Limit to 30 reviews per page
            .populate('user_id', 'name email profile_img'); // Include user details

        // Get total number of reviews for pagination metadata
        const totalReviews = await Rating.countDocuments({ astrologer_id: id });

        return res.status(200).json({
            success: true,
            message: 'Astrologer reviews fetched successfully',
            data: {
                reviews,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalReviews / limit),
                    totalReviews,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getActiveAstrologers, addRatingAndReview, getAstroById, getAstrologerReviews };
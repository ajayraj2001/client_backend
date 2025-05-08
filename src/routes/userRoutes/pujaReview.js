// routes/pujaReviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/user/reviewController');
const { authenticateUser } = require('../../middlewares')

// User routes (require authentication)
router.post('/submit', authenticateUser, reviewController.submitPujaReview);
router.get('/user', authenticateUser, reviewController.getUserPujaReviewByTransaction);
// router.get('/user', authenticateUser, reviewController.getUserPujaReviews);
// router.delete('/:reviewId', authenticateUser, reviewController.deletePujaReview);
// router.get('/can_review/:pujaId', authenticateUser, reviewController.canUserReviewPuja);

// Public routes
router.get('/:pujaId', reviewController.getPujaReviews);

module.exports = router;
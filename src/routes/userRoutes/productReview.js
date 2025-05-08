// routes/pujaReviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/user/reviewController');
const { authenticateUser } = require('../../middlewares')

// Admin routes
// router.get('/admin/all', authenticateUser, authorizeAdmin, reviewController.getAllPujaReviews);
// router.patch('/admin/:reviewId/status', authenticateUser, authorizeAdmin, reviewController.updatePujaReviewStatus);


// User routes (require authentication)
router.post('/submit', authenticateUser, reviewController.submitProductReview);
router.get('/user', authenticateUser, reviewController.getUserProductReviewByTransaction);
// router.get('/user', authenticateUser, reviewController.getUserProductReviews);
// router.delete('/:reviewId', authenticateUser, reviewController.deleteProductReview);
router.get('/can_review/:productId', authenticateUser, reviewController.canUserReviewProduct);
router.post('/:reviewId/vote', authenticateUser, reviewController.voteProductReview);

// Public routes
router.get('/:productId', reviewController.getProductReviews);

// Admin routes
// router.get('/admin/all', authenticateUser, authorizeAdmin, reviewController.getAllProductReviews);
// router.patch('/admin/:reviewId/status', authenticateUser, authorizeAdmin, reviewController.updateProductReviewStatus);

module.exports = router;
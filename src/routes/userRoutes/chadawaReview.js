// routes/chadawaReviewRoutes.js
const express = require('express');
const router = express.Router();
const chadawaReviewController = require('../../controllers/user/chadawaReviewController.js');
const { authenticateUser } = require('../../middlewares/index.js');

// User routes (require authentication)
router.post('/submit', authenticateUser, chadawaReviewController.submitChadawaReview);
router.get('/user', authenticateUser, chadawaReviewController.getUserChadawaReviewByTransaction);

// Public routes
router.get('/:chadawaId', chadawaReviewController.getChadawaReviews);

// Admin routes (require admin authentication)
router.put('/admin/status/:reviewId', authenticateUser, chadawaReviewController.updateChadawaReviewStatus);

module.exports = router;
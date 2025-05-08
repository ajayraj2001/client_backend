// // routes/pujaReviewRoutes.js
// const express = require('express');
// const router = express.Router();
// const pujaReviewController = require('../controllers/pujaReviewController');
// const { authenticateUser, authorizeAdmin } = require('../middleware/auth'); // Assuming you have auth middleware

// // User routes (require authentication)
// router.post('/submit', authenticateUser, pujaReviewController.submitPujaReview);
// router.get('/user', authenticateUser, pujaReviewController.getUserPujaReviews);
// router.delete('/:reviewId', authenticateUser, pujaReviewController.deletePujaReview);
// router.get('/can-review/:pujaId', authenticateUser, pujaReviewController.canUserReviewPuja);

// // Public routes
// router.get('/:pujaId', pujaReviewController.getPujaReviews);

// // Admin routes
// router.get('/admin/all', authenticateUser, authorizeAdmin, pujaReviewController.getAllPujaReviews);
// router.patch('/admin/:reviewId/status', authenticateUser, authorizeAdmin, pujaReviewController.updatePujaReviewStatus);

// module.exports = router;


// // routes/productReviewRoutes.js
// const express = require('express');
// const router = express.Router();
// const productReviewController = require('../controllers/productReviewController');
// const { authenticateUser, authorizeAdmin } = require('../middleware/auth'); // Assuming you have auth middleware

// // User routes (require authentication)
// router.post('/submit', authenticateUser, productReviewController.submitProductReview);
// router.get('/user', authenticateUser, productReviewController.getUserProductReviews);
// router.delete('/:reviewId', authenticateUser, productReviewController.deleteProductReview);
// router.get('/can-review/:productId', authenticateUser, productReviewController.canUserReviewProduct);
// router.post('/:reviewId/vote', authenticateUser, productReviewController.voteProductReview);

// // Public routes
// router.get('/:productId', productReviewController.getProductReviews);

// // Admin routes
// router.get('/admin/all', authenticateUser, authorizeAdmin, productReviewController.getAllProductReviews);
// router.patch('/admin/:reviewId/status', authenticateUser, authorizeAdmin, productReviewController.updateProductReviewStatus);

// module.exports = router;
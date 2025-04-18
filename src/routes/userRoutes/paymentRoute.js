const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const paymentController = require("../../controllers/user/paymentController");


// Create orders
router.post('/create-puja-order',authenticateUser,  paymentController.createPujaOrder);
router.post('/create-product-order',authenticateUser,  paymentController.createProductOrder);

// Mark payment as attempted (to include in history)
router.post('/mark-payment-attempted',authenticateUser,  paymentController.markPaymentAttempted);

// Verify payment
router.post('/verify-payment', authenticateUser, paymentController.verifyPayment);

// Get transaction history
router.get('/transactions',authenticateUser,  paymentController.getTransactionHistory);

// Get transaction details
router.get('/transaction/:type/:id', authenticateUser, paymentController.getTransactionDetails);

// Cancel transaction
router.post('/cancel-transaction/:type/:id',authenticateUser,  paymentController.cancelTransaction);

module.exports = router;
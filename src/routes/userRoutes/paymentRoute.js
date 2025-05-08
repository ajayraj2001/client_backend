const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const paymentController = require("../../controllers/user/paymentController");


router.post('/webhook', paymentController.handleWebhook);

// Create orders
router.post('/create_puja_order', authenticateUser, paymentController.createPujaOrder);
router.post('/create_product_order', authenticateUser, paymentController.createProductOrder);

// Mark payment as attempted (to include in history)
router.post('/mark_payment_attempted', authenticateUser, paymentController.markPaymentAttempted);

// Verify payment
router.post('/verify_payment', authenticateUser, paymentController.verifyPayment);
router.post('/payment_failure', paymentController.handlePaymentFailure);
router.get('/check_status/:type/:transactionId', paymentController.checkPaymentStatus);

// Get transaction history
router.get('/transactions', authenticateUser, paymentController.getTransactionHistory);
router.get('/getProductDetailsFromOrder/:transactionId/:productInstanceId', authenticateUser, paymentController.getProductDetailsFromOrder);
router.get('/getPujaDetailsFromOrder/:pujaID', authenticateUser, paymentController.getPujaDetailsFromOrder);

// Get transaction details
// router.get('/transaction/:type/:id', authenticateUser, paymentController.getTransactionDetails);

// Cancel transaction
router.post('/cancel_transaction/:type/:id', authenticateUser, paymentController.cancelTransaction);

// Admin-only routes
router.post('/refund_transaction/:type/:id', paymentController.refundTransaction);
router.get('/stats', paymentController.getPaymentStats);

module.exports = router;
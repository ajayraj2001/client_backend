const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const paymentController = require("../../controllers/user/paymentController");


// puja -- routes
router.post(
    '/webhook/puja',
    express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }),
    paymentController.handlePujaWebhook
);
// router.post('/puja_webhook', paymentController.handlePujaWebhook);
router.post('/create_puja_order', authenticateUser, paymentController.createPujaOrder);
router.get('/puja_transactions', authenticateUser, paymentController.getPujaTransactionHistory);
router.get('/puja_transaction_details/:transactionId', authenticateUser, paymentController.getPujaTransactionDetails);
router.get('/puja_details_from_order/:pujaID', authenticateUser, paymentController.getPujaDetailsFromOrder);


//chadawa
router.post(
  '/webhook/chadawa',
  express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }),
  paymentController.handleChadawaWebhook
);

// Chadawa transaction routes
router.post('/create_chadawa_order', authenticateUser, paymentController.createChadawaOrder);
router.get('/chadawa_transactions', authenticateUser, paymentController.getChadawaTransactionHistory);
router.get('/chadawa_transaction_details/:transactionId', authenticateUser, paymentController.getChadawaTransactionDetails);
router.get('/chadawa_details_from_order/:chadawaID', authenticateUser, paymentController.getChadawaDetailsFromOrder);


//extra of no use for current
router.post('/create_product_order', authenticateUser, paymentController.createProductOrder);
router.post('/mark_payment_attempted', authenticateUser, paymentController.markPaymentAttempted);
router.post('/verify_payment', authenticateUser, paymentController.verifyPayment);
router.post('/payment_failure', paymentController.handlePaymentFailure);
router.get('/check_status/:type/:transactionId', paymentController.checkPaymentStatus);
router.get('/getProductDetailsFromOrder/:transactionId/:productInstanceId', authenticateUser, paymentController.getProductDetailsFromOrder);

// Cancel transaction
router.post('/cancel_transaction/:type/:id', authenticateUser, paymentController.cancelTransaction);

// Admin-only routes
router.post('/refund_transaction/:type/:id', paymentController.refundTransaction);
router.get('/stats', paymentController.getPaymentStats);

module.exports = router;
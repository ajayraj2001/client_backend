const authenticateUser = require("../middlewares/authenticateUser");
const bodyParser = require("body-parser");

const {
  login,
  verifyOTP,
  getProfile,
  updateProfile,
  logout,
} = require("../controllers//user/authContoller");

const {
  getDashboardData
} = require("../controllers//user/dashboardController");

const {
  getActiveAstrologers,
  addRatingAndReview,
  getAstrologerProfileWithReviews,
  getAstrologerReviews
} = require("../controllers//user/astrologerController");

const {
  initiateRecharge,
  getWalletHistory
} = require("../controllers/user/transactionController");

const {
  handleRazorpayWebhook
} = require("../controllers/paymentGateway/paymentWebhook");

const userRoute = require("express").Router();

//auth
userRoute.post('/login', login);
userRoute.post('/verify_otp', verifyOTP);
userRoute.get("/profile", authenticateUser, getProfile);
userRoute.put('/update_profile', authenticateUser, updateProfile);
userRoute.post('/logout', authenticateUser, logout)

//dashboard
userRoute.get("/dashboard", authenticateUser, getDashboardData);

//astrologers
userRoute.get("/getAstrologers", authenticateUser, getActiveAstrologers);
userRoute.get("/getAstrologerReviews", authenticateUser, getAstrologerReviews);
userRoute.post("/addRatingAndReview", authenticateUser, addRatingAndReview);
userRoute.get("/getAstrologerProfileWithReviews", authenticateUser, getAstrologerProfileWithReviews);

//transactions
userRoute.post('/recharge', authenticateUser, initiateRecharge);
// Razorpay webhook
userRoute.post('/razorpay_webhook', handleRazorpayWebhook);
userRoute.post('/getWalletHistory', getWalletHistory);


module.exports = userRoute;

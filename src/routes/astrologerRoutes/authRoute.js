const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");
const {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getAstrologerProfile,
  updateAstrologerProfile,
  logout,
} = require("../../controllers/astrologer/authController");

// User authentication routes
router.post('/login', login);
router.post('/forgot_password', forgotPassword);
router.post('/verify_otp', verifyOtp);
router.post('/reset_password', resetPassword);
router.get("/profile", authenticateAstrologer, getAstrologerProfile);
router.put('/update_profile', authenticateAstrologer, updateAstrologerProfile);
router.post('/logout', authenticateAstrologer, logout);

module.exports = router;
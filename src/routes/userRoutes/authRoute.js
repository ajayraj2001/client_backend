const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  login,
  verifyOTP,
  getProfile,
  updateProfile,
  deleteProfile,
  logout,
  sendEmailVerificationOtp,
  verifyEmailOtp
} = require("../../controllers/user/authContoller");

// User authentication routes
router.post('/login', login);
router.post('/verify_otp', verifyOTP);
router.get("/profile", authenticateUser, getProfile);
router.put('/update_profile', authenticateUser, updateProfile);
router.delete('/delete_profile', authenticateUser, deleteProfile);
router.post('/logout', authenticateUser, logout);
router.post('/sendEmailVerificationOtp', authenticateUser, sendEmailVerificationOtp);
router.post('/verifyEmailOtp', authenticateUser, verifyEmailOtp);

module.exports = router;
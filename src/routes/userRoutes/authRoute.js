const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  login,
  verifyOTP,
  getProfile,
  updateProfile,
  logout,
} = require("../../controllers/user/authContoller");

// User authentication routes
router.post('/login', login);
router.post('/verify_otp', verifyOTP);
router.get("/profile", authenticateUser, getProfile);
router.put('/update_profile', authenticateUser, updateProfile);
router.post('/logout', authenticateUser, logout);

module.exports = router;
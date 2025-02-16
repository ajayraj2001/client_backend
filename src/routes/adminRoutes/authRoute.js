const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getProfile,
  changePassword,
  getAdminDashboardStats,
  getAdminDashboardChartData
} = require("../../controllers/admin/authContoller");

// User authentication routes
router.post("/login", login);
router.post("/forget_password", forgotPassword);
router.post("/verify_otp", verifyOtp);
router.post("/reset_password", resetPassword);
router.get("/profile", authenticateAdmin, getProfile);
router.put("/change_password", authenticateAdmin, changePassword);
router.get("/getAdminDashboardStats", authenticateAdmin, getAdminDashboardStats);
router.get("/getAdminDashboardChartData", authenticateAdmin, getAdminDashboardChartData);

module.exports = router;
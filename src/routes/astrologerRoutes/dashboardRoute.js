const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");
const { getAstroDashboard, getAstrologerStats, getAstrologerOnlineStats } = require("../../controllers/astrologer/dashboardController");

// // Dashboard routes
router.get("/", authenticateAstrologer,  getAstroDashboard);
router.get("/stats", authenticateAstrologer, getAstrologerStats);
router.get("/profileStats",authenticateAstrologer,  getAstrologerOnlineStats);
// router.get("/", authenticateAstrologer, getDashboardData);

module.exports = router;
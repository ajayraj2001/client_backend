const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");
const { getAstroDashboard, getAstrologerStats, getAstrologerOnlineStats } = require("../../controllers/astrologer/dashboardController");

// // Dashboard routes
router.get("/", getAstroDashboard);
router.get("/stats", getAstrologerStats);
router.get("/profileStats", getAstrologerOnlineStats);
// router.get("/", authenticateAstrologer, getDashboardData);

module.exports = router;
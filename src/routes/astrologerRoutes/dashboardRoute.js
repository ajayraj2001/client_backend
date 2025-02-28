const express = require("express");
const router = express.Router();
const { authenticateAstrologer } = require("../../middlewares");
const { getAstroDashboard } = require("../../controllers/astrologer/dashboardController");

// // Dashboard routes
router.get("/", getAstroDashboard);
// router.get("/", authenticateAstrologer, getDashboardData);

module.exports = router;
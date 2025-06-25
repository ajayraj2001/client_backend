const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const { getHomePageData } = require("../../controllers/user/dashboardController");

// Dashboard routes
// router.get("/", authenticateUser, getDashboardData);
router.get("/", getHomePageData);

module.exports = router;
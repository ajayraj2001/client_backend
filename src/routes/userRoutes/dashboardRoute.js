const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const { getDashboardData, getHomePageData } = require("../../controllers/user/dashboardController");

// Dashboard routes
router.get("/", authenticateUser, getDashboardData);
router.get("/home", getHomePageData);

module.exports = router;
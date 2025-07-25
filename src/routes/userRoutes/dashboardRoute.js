const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const optionalAuthenticateUser = require("../../middlewares/optionalAuthenticateUser");
const { getHomePageData } = require("../../controllers/user/dashboardController");

// Dashboard routes
// router.get("/", authenticateUser, getDashboardData);
router.get("/", optionalAuthenticateUser, getHomePageData);

module.exports = router;
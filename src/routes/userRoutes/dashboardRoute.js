const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const { getDashboardData } = require("../../controllers/user/dashboardController");

// Dashboard routes
router.get("/", authenticateUser, getDashboardData);

module.exports = router;
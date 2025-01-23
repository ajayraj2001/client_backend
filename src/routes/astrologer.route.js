const express = require("express");
const astrologerRoute = express.Router();

const { authenticateAstrologer } = require("../middlewares");

// Import the separate route files
const authRoutes = require("./astrologerRoutes/authRoute");
const dashboardRoutes = require("./astrologerRoutes/dashboardRoute");
const transactionRoutes = require("./astrologerRoutes/transactionRoute");
const chatRoutes = require("./astrologerRoutes/chatRoute");

// Use the routes
astrologerRoute.use("/auth", authRoutes); // For authentication routes
astrologerRoute.use("/dashboard", dashboardRoutes); // For dashboard routes
astrologerRoute.use("/transactions", transactionRoutes); // For transaction routes
astrologerRoute.use("/chat", chatRoutes); // For chat routes

module.exports = astrologerRoute;
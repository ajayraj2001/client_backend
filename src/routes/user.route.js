const express = require("express");
const userRoute = express.Router();

const { authenticateUser } = require("../middlewares");

// Import the separate route files
const authRoutes = require("./userRoutes/authRoute");
const dashboardRoutes = require("./userRoutes/dashboardRoute");
const astrologerRoutes = require("./userRoutes/astrologerRoute");
const transactionRoutes = require("./userRoutes/transactionRoute");
const chatRoutes = require("./userRoutes/chatRoutes");
const siteSettingRoutes = require("./userRoutes/siteSettingRoute");
const pujaRoutes = require("./userRoutes/pujaRoute");
const categoryRoutes = require("./userRoutes/categoryRoute");
const productRoutes = require("./userRoutes/productRoute");

// Use the routes
userRoute.use("/auth", authRoutes); // For authentication routes
userRoute.use("/dashboard", dashboardRoutes); // For dashboard routes
userRoute.use("/astrologers", astrologerRoutes); // For astrologer routes
userRoute.use("/transactions", transactionRoutes); // For transaction routes
userRoute.use("/chat", chatRoutes); // For chat routes
userRoute.use("/siteSetting", siteSettingRoutes);
userRoute.use("/puja", pujaRoutes);
userRoute.use('/category', categoryRoutes);
userRoute.use('/product', productRoutes);


module.exports = userRoute;
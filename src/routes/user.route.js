const express = require("express");
const userRoute = express.Router();

// Import the separate route files
const authRoutes = require("./userRoutes/authRoute");
const dashboardRoutes = require("./userRoutes/dashboardRoute");
const blogRoutes = require("./userRoutes/blogRoute");
const astrologerRoutes = require("./userRoutes/astrologerRoute");
const transactionRoutes = require("./userRoutes/transactionRoute");
const chatRoutes = require("./userRoutes/chatRoutes");
const siteSettingRoutes = require("./userRoutes/siteSettingRoute");
const pujaRoutes = require("./userRoutes/pujaRoute");
const chadawaRoutes = require("./userRoutes/chadawaRoute.js");
const categoryRoutes = require("./userRoutes/categoryRoute");
const productRoutes = require("./userRoutes/productRoute");
const paymentRoutes = require('./userRoutes/paymentRoute');
const cartRoutes = require('./userRoutes/cartRoute');
const addressRoutes = require('./userRoutes/addressRoute');
const pujaReviewRoutes = require('./userRoutes/pujaReview');
const chadawaReviewRoutes = require('./userRoutes/chadawaReview.js');
const productReviewRoutes = require('./userRoutes/productReview');
const notificationRoutes = require('./userRoutes/notificationRoute');

// Use the routes
userRoute.use("/auth", authRoutes); // For authentication routes
userRoute.use("/dashboard", dashboardRoutes); // For dashboard routes
userRoute.use("/blogs", blogRoutes); 
userRoute.use("/astrologers", astrologerRoutes); // For astrologer routes
userRoute.use("/transactions", transactionRoutes); // For transaction routes
userRoute.use("/chat", chatRoutes); // For chat routes
userRoute.use("/siteSetting", siteSettingRoutes);
userRoute.use("/puja", pujaRoutes);
userRoute.use("/chadawa", chadawaRoutes);
userRoute.use('/category', categoryRoutes);
userRoute.use('/product', productRoutes);
userRoute.use('/payment', paymentRoutes);
userRoute.use('/cart', cartRoutes);
userRoute.use('/address', addressRoutes);
userRoute.use('/pujaReview', pujaReviewRoutes);
userRoute.use('/chadawaReview', chadawaReviewRoutes);
userRoute.use('/productReview', productReviewRoutes);
userRoute.use('/notification', notificationRoutes);

module.exports = userRoute;
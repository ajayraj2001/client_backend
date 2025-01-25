const express = require("express");
const adminRoute = express.Router();

const { authenticateAdmin } = require("../middlewares");

// Import the separate route files
const authRoutes = require("./adminRoutes/authRoute");
const astrologerRoutes = require("./adminRoutes/astrologerRoute");
const userRoutes = require("./adminRoutes/userRoute");
const blogRoutes = require("./adminRoutes/blogRoute");
const bannerRoutes = require("./adminRoutes/bannerRoute");
const languageRoutes = require("./adminRoutes/languageRoute");
const skillRoutes = require("./adminRoutes/skillRoute");
const pujaRoutes = require("./adminRoutes/pujaRoute");


// Use the routes
adminRoute.use("/auth", authRoutes);
adminRoute.use('/astrologers', astrologerRoutes);
adminRoute.use('/users', userRoutes);
adminRoute.use("/blogs", blogRoutes); 
adminRoute.use('/banners', bannerRoutes);
adminRoute.use("/languages", languageRoutes); 
adminRoute.use('/skills', skillRoutes);
adminRoute.use('/puja', pujaRoutes);

module.exports = adminRoute;

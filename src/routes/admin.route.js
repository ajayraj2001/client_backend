const {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getProfile,
  changePassword,
} = require("../controllers/admin/authContoller");

const {
  createAstrologer,
  updateAstrologer,
  deleteAstrologer,
  getAllAstrologers,
  getAstrologerById,
  updateAstrologerStatus,
} = require("../controllers/admin/astrologerController");

const {
  createBanner,
  updateBanner,
  deleteBanner,
  getAllBanners,
  getBannerById,
} = require("../controllers/admin/bannerController");

const {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
} = require("../controllers/admin/blogController");


const { authenticateAdmin } = require("../middlewares");

const adminRoute = require("express").Router();

//---------- user auth ----------
adminRoute.post("/login", login);
adminRoute.post("/forget_password", forgotPassword);
adminRoute.post("/verify_otp", verifyOtp);
adminRoute.post("/reset_password", resetPassword);
adminRoute.get("/profile", authenticateAdmin, getProfile);
// adminRoute.put("/profile", authenticateAdmin, updateProfile);
adminRoute.put("/change_password", authenticateAdmin, changePassword);

// Admin routes for managing astrologers
adminRoute.post('/astrologers', authenticateAdmin, createAstrologer);
adminRoute.put('/astrologers/:id', authenticateAdmin, updateAstrologer);
adminRoute.delete('/astrologers/:id', authenticateAdmin, deleteAstrologer);
adminRoute.get('/astrologers', authenticateAdmin, getAllAstrologers);
adminRoute.get('/astrologers/:id', authenticateAdmin, getAstrologerById);
adminRoute.put('/astrologers/:id/status', authenticateAdmin, updateAstrologerStatus);

// Admin routes for managing banners
adminRoute.post('/banners', authenticateAdmin, createBanner);
adminRoute.put('/banners/:id', authenticateAdmin, updateBanner);
adminRoute.delete('/banners/:id', authenticateAdmin, deleteBanner);
adminRoute.get('/banners', authenticateAdmin, getAllBanners);
adminRoute.get('/banners/:id', authenticateAdmin, getBannerById);

// Admin routes for managing blogs
adminRoute.post('/blogs', authenticateAdmin, createBlog);
adminRoute.put('/blogs/:id', authenticateAdmin, updateBlog);
adminRoute.delete('/blogs/:id', authenticateAdmin, deleteBlog);
adminRoute.get('/blogs', authenticateAdmin, getAllBlogs);
adminRoute.get('/blogs/:id', authenticateAdmin, getBlogById);


//dashboard
// adminRoute.get("/dashboard", authenticateAdmin, adminDashboard)

// //------getActiveUses--------
// adminRoute.get("/getAllUsers", authenticateAdmin, getUsers)
// adminRoute.put("/updateUser", authenticateAdmin, updateUser)


// //---------- appData --------
// adminRoute.post("/appData", authenticateAdmin, createAppData);
// adminRoute.get("/appData", authenticateAdmin, getAllAppData);
// adminRoute.patch("/appData/:id", authenticateAdmin, updateAppData);
// adminRoute.delete("/appData/:id", authenticateAdmin, deleteAppData);

module.exports = adminRoute;

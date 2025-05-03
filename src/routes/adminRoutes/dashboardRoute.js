const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
    getAdminRevenueDashboard,
    getAdminUserDashboard,
    getAdminStats
} = require("../../controllers/admin/dashboardController");


router.get('/revenue', getAdminRevenueDashboard);

/**
 * @route   GET /api/admin/dashboard/users
 * @desc    Get admin user dashboard data
 * @access  Admin only
 * @query   {string} period - Time period (7d, 30d, 12m, this_week, this_month, ytd)
 */
router.get('/users', getAdminUserDashboard);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', getAdminStats);


module.exports = router;
const { ApiError } = require('../../errorHandler');
const { Banner, Blog, Astrologer } = require('../../models');

const getDashboardData = async (req, res, next) => {
  try {
    const user = req.user; // User info from middleware

    // Remove password from user object
    const userProfile = { ...user.toObject() };
    delete userProfile.otp;

    // Fetch active banners
    const activeBanners = await Banner.find({ status: 'Active', type: 'app' });

    // Fetch active blogs
    const activeBlogs = await Blog.find({ status: 'Active' });

    // Fetch top 4 astrologers with is_chat_online = "on"
    const onlineAstrologers = await Astrologer.find({ status: "Active", is_chat: "on", is_chat_online: 'on' })
      .limit(4) // Limit to 4 astrologers
      .select('-password -aadhar_card_img -pan_card_img') // Exclude password field
      .populate('languages', 'name')
      .populate('skills', 'name');

    return res.status(200).json({
      success: true,
      message: 'Dashboard data fetched successfully',
      data: {
        userProfile,
        activeBanners,
        activeBlogs,
        onlineAstrologers,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardData };
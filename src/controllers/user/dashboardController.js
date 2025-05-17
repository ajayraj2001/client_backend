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
    const onlineAstrologers = await Astrologer.find({ status: "Active" })
      // const onlineAstrologers = await Astrologer.find({ status: "Active", is_chat: "on", is_chat_online: 'on' })
      .limit(10) // Limit to 4 astrologers
      .sort({ busy: 1, rating: -1 })
      .select('name experience rating profile_img is_chat is_chat_online per_min_chat display_per_min_chat display_per_min_voice_call') // Exclude password field
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
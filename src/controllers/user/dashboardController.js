const { ApiError } = require('../../errorHandler');
const { Banner, Blog, Astrologer, PujaReview, Puja } = require('../../models');

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

const getHomePageData = async (req, res, next) => {
  try {
    const now = new Date();

    // ===== 1. PUJAS =====
    const allPujas = await Puja.find({})
      .select('title pujaImage slug displayedPrice actualPrice pujaDate rating shortDescription isPopular')
      .lean();

    const popularPujas = allPujas
      .filter(puja => puja.isPopular && puja.pujaDate && new Date(puja.pujaDate) >= now)
      .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

    const normalPujas = allPujas
      .filter(puja => !puja.isPopular && puja.pujaDate && new Date(puja.pujaDate) >= now)
      .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

    const homePujas = [...popularPujas, ...normalPujas].slice(0, 6);

    const transformedPujas = homePujas.map(puja => ({
      _id: puja._id,
      title: puja.title,
      slug: puja.slug,
      pujaImage: puja.pujaImage,
      displayedPrice: puja.displayedPrice,
      rating: puja.rating,
      actualPrice: puja.actualPrice,
      pujaDate: puja.pujaDate,
      shortDescription: puja.shortDescription,
      isPopular: puja.isPopular,
    }));

    // ===== 2. PUJA REVIEWS =====
    const testimonials = await PujaReview.find({ status: 'Active' })
      .sort({ created_at: -1 })
      .limit(5)
      .populate('userId', 'name profileImage')  // if user name/profileImage exists
      .populate('pujaId', 'title')              // if puja title needed
      .lean();

    // ===== 3. BANNERS =====
    const banners = await Banner.find({ status: 'Active' })
      .sort({ created_at: -1 })
      .lean();

    // ===== 4. BLOGS =====
    const blogs = await Blog.find({ status: 'Active' })
      .sort({ created_at: -1 })
      .limit(5)
      .select('title slug featuredImage excerpt tags created_at')
      .lean();

    // ===== RETURN RESPONSE =====
    return res.status(200).json({
      success: true,
      message: 'Home page data fetched successfully',
      data: {
        pujas: transformedPujas,
        chadawa: transformedPujas,
        testimonials,
        banners,
        blogs,
      },
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardData , getHomePageData};
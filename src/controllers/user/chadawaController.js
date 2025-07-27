const { ApiError } = require('../../errorHandler');
const { Chadawa, ChadawaReview } = require('../../models');

const getAllChadawas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const { search, lang = 'en' } = req.query;

    const now = new Date();
    const filter = { status: 'Active' }; // Only fetch active chadawas

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { titleHindi: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch all chadawas matching the filter
    const allChadawas = await Chadawa.find(filter)
      .select('title titleHindi chadawaImage slug displayedPrice location locationHindi rating actualPrice chadawaDate shortDescription shortDescriptionHindi isPopular')
      .lean();

    // Split into popular and non-popular
    const popularChadawas = allChadawas
      .filter(chadawa => chadawa.isPopular && chadawa.chadawaDate && new Date(chadawa.chadawaDate) >= now)
      .sort((a, b) => new Date(a.chadawaDate) - new Date(b.chadawaDate));

    const normalChadawas = allChadawas
      .filter(chadawa => !chadawa.isPopular && chadawa.chadawaDate && new Date(chadawa.chadawaDate) >= now)
      .sort((a, b) => new Date(a.chadawaDate) - new Date(b.chadawaDate));

    const sortedChadawas = [...popularChadawas, ...normalChadawas];

    const paginatedChadawas = sortedChadawas.slice(skip, skip + limit);

    const transformed = paginatedChadawas.map(chadawa => ({
      _id: chadawa._id,
      title: lang === "hi" ? chadawa.titleHindi : chadawa.title,
      slug: chadawa.slug,
      chadawaImage: chadawa.chadawaImage,
      displayedPrice: chadawa.displayedPrice,
      location: lang === "hi" ? chadawa.locationHindi : chadawa.location,
      rating: chadawa.rating,
      actualPrice: chadawa.actualPrice,
      chadawaDate: chadawa.chadawaDate,
      shortDescription: lang === 'hi' ? chadawa.shortDescriptionHindi : chadawa.shortDescription,
      isPopular: chadawa.isPopular,
    }));

    return res.status(200).json({
      success: true,
      message: 'Chadawas fetched successfully',
      data: transformed,
      pagination: {
        total: sortedChadawas.length,
        page,
        limit,
        totalPages: Math.ceil(sortedChadawas.length / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getChadawaBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const lang = req.query.lang || 'en';

    const chadawa = await Chadawa.findOne({ slug, status: 'Active' });

    if (!chadawa) {
      throw new ApiError('Chadawa not found', 404);
    }

    const reviews = await ChadawaReview.find({ chadawaId: chadawa._id, status: 'Active' })
      .populate('userId', 'name profile_img')
      .sort({ created_at: -1 })
      .limit(5);

    const getField = (en, hi) => (lang === 'hi' ? hi : en);

    const formatted = {
      _id: chadawa._id,
      title: getField(chadawa.title, chadawa.titleHindi),
      chadawaImage: chadawa.chadawaImage,
      slug: chadawa.slug,
      displayedPrice: chadawa.displayedPrice,
      actualPrice: chadawa.actualPrice,
      rating: chadawa.rating,
      bannerImages: chadawa.bannerImages,
      chadawaDate: chadawa.chadawaDate,
      location: getField(chadawa.location, chadawa.locationHindi),
      aboutChadawa: getField(chadawa.aboutChadawa, chadawa.aboutChadawaHindi),
      shortDescription: getField(chadawa.shortDescription, chadawa.shortDescriptionHindi),
      isPopular: chadawa.isPopular,
      status: chadawa.status,
      benefits: chadawa.benefits.map(b => ({
        header: getField(b.header, b.headerHindi),
        description: getField(b.description, b.descriptionHindi)
      })),
      faq: chadawa.faq.map(f => ({
        question: getField(f.question, f.questionHindi),
        answer: getField(f.answer, f.answerHindi)
      })),
      // Single offering object (not array)
      offering: chadawa.offerings ? {
        header: getField(chadawa.offerings.header, chadawa.offerings.headerHindi),
        description: getField(chadawa.offerings.description, chadawa.offerings.descriptionHindi),
        price: chadawa.offerings.price,
        image: chadawa.offerings.image
      } : null
    };

    return res.status(200).json({
      success: true,
      message: 'Chadawa fetched successfully',
      data: {
        chadawa: formatted,
        latestReviews: reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getChadawaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || 'en';

    const chadawa = await Chadawa.findOne({ _id: id, status: 'Active' });

    if (!chadawa) {
      throw new ApiError('Chadawa not found', 404);
    }

    const reviews = await ChadawaReview.find({ chadawaId: chadawa._id, status: 'Active' })
      .populate('userId', 'name profile_img')
      .sort({ created_at: -1 })
      .limit(5);

    const getField = (en, hi) => (lang === 'hi' ? hi : en);

    const formatted = {
      _id: chadawa._id,
      title: getField(chadawa.title, chadawa.titleHindi),
      chadawaImage: chadawa.chadawaImage,
      slug: chadawa.slug,
      displayedPrice: chadawa.displayedPrice,
      actualPrice: chadawa.actualPrice,
      rating: chadawa.rating,
      bannerImages: chadawa.bannerImages,
      chadawaDate: chadawa.chadawaDate,
      location: getField(chadawa.location, chadawa.locationHindi),
      aboutChadawa: getField(chadawa.aboutChadawa, chadawa.aboutChadawaHindi),
      shortDescription: getField(chadawa.shortDescription, chadawa.shortDescriptionHindi),
      isPopular: chadawa.isPopular,
      status: chadawa.status,
      benefits: chadawa.benefits.map(b => ({
        header: getField(b.header, b.headerHindi),
        description: getField(b.description, b.descriptionHindi)
      })),
      faq: chadawa.faq.map(f => ({
        question: getField(f.question, f.questionHindi),
        answer: getField(f.answer, f.answerHindi)
      })),
      // Single offering object (not array)
      offerings: chadawa.offerings ? {
        header: getField(chadawa.offerings.header, chadawa.offerings.headerHindi),
        description: getField(chadawa.offerings.description, chadawa.offerings.descriptionHindi),
        price: chadawa.offerings.price,
        image: chadawa.offerings.image
      } : null
    };

    return res.status(200).json({
      success: true,
      message: 'Chadawa fetched successfully',
      data: {
        chadawa: formatted,
        latestReviews: reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllChadawas,
  getChadawaById,
  getChadawaBySlug
};